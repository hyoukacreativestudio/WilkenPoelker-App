const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');
const { parseArticleXml, parseReservations, classifyFile, applyCatalog } = require('./taifunArticleParser');
const catalog = require('./shopCatalog');

// Bruno's stock exports land in the SFTP folder /Bestand (one file per
// Warengruppe, Kaercher separately, + the reservation list). The cron imports
// every file, moves it to Bestand/archiv/ (kept 14 days) or, if it cannot be read,
// to Bestand/failed/ with the reason, and rebuilds the product pages.
const DIR = process.env.SHOP_STOCK_DIR || '/apps/wpapp/inbox/Bestand';
const ARCHIVE_DAYS = 14;

// The names of the files may change: any of these is read, the content decides.
const isStockFile = (name) => /\.(xml|txt|csv)$/i.test(name);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

let running = false;

async function moveTo(sub, name, note) {
  await fs.mkdir(path.join(DIR, sub), { recursive: true });
  const target = path.join(DIR, sub, `${stamp()}_${name}`);
  await fs.rename(path.join(DIR, name), target);
  if (note) await fs.writeFile(`${target}.txt`, note);
}

async function pruneArchive() {
  const dir = path.join(DIR, 'archiv');
  const cutoff = Date.now() - ARCHIVE_DAYS * 24 * 3600 * 1000;
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(dir, e.name);
    const st = await fs.stat(full);
    if (st.mtimeMs < cutoff) await fs.unlink(full).catch(() => {});
  }
}

async function scanAndImport() {
  // Off until Bruno transfers live data: the folder holds test files until then,
  // and those must not end up in front of customers.
  if (process.env.SHOP_IMPORT_ENABLED !== 'true') return { scanned: 0, disabled: true };
  if (running) return { skipped: true };
  running = true;
  try {
    let entries;
    try { entries = await fs.readdir(DIR, { withFileTypes: true }); } catch { return { scanned: 0 }; }
    const files = [];
    for (const e of entries) {
      if (!e.isFile() || !isStockFile(e.name)) continue;
      const st = await fs.stat(path.join(DIR, e.name));
      // Skip files that are still being uploaded (changed in the last 30 s)
      if (Date.now() - st.mtimeMs < 30 * 1000) continue;
      const buf = await fs.readFile(path.join(DIR, e.name));
      files.push({ name: e.name, mtime: st.mtimeMs, buf, kind: classifyFile(buf) });
    }
    if (!files.length) return { scanned: 0 };
    // Oldest first, reservations after the articles of the same run
    const rank = (f) => (f.kind === 'reservations' ? 1 : 0);
    files.sort((a, b) => (rank(a) - rank(b)) || (a.mtime - b.mtime));

    const result = { scanned: files.length, articles: 0, inserted: 0, reservations: 0, failed: 0 };
    for (const f of files) {
      try {
        if (!f.kind) throw new Error('Unbekannter Dateiinhalt: weder Artikel-XML noch Reservierungsliste');
        if (f.kind === 'articles') {
          // An XML without <ArtList> (e.g. reservations in an unknown layout) fails here
          const list = applyCatalog(parseArticleXml(f.buf), f.name);
          const r = await catalog.upsertArticles(list, f.name);
          result.articles += list.length;
          result.inserted += r.inserted;
        } else {
          const r = await catalog.applyReservations(parseReservations(f.buf), f.name);
          result.reservations += r.reservedArticles;
        }
        await moveTo('archiv', f.name);
      } catch (err) {
        result.failed += 1;
        logger.error('Shop stock file failed', { file: f.name, error: err.message });
        await moveTo('failed', f.name, `${new Date().toISOString()}\n${err.stack || err.message}`).catch(() => {});
      }
    }
    const rebuilt = await catalog.rebuildProducts();
    await pruneArchive();
    logger.info('Shop stock import', { ...result, products: rebuilt.products });
    // New pages: fetch manufacturer pictures + data in the background
    if (result.inserted > 0) {
      require('./enrich').enrichMissing({ limit: 400 }).catch((e) => logger.error('Shop enrich failed', { error: e.message }));
    }
    return { ...result, products: rebuilt.products };
  } finally {
    running = false;
  }
}

module.exports = { scanAndImport, isStockFile, DIR };
