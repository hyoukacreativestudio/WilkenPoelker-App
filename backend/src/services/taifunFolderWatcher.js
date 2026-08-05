const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const taifunSyncService = require('./taifunSyncService');

// Where Bruno's SFTP user drops XML files. Cron picks them up, imports each,
// then DELETES it on success (or moves it to failed/ with a .txt error log).
//
// Deleting on success is deliberate: Taifun re-uses the same file names
// (AU-APP.xml, AU-APP2.xml, ...) on every export. If we kept the processed
// files around, the next export would collide with the old names. Removing the
// file right after import keeps the SFTP inbox clean for the next batch.
//
// Set TAIFUN_KEEP_PROCESSED=1 to archive into processed/ instead of deleting
// (useful for debugging; not the default).
const INBOX = process.env.TAIFUN_INBOX || '/apps/wpapp/inbox/taifun';
const KEEP_PROCESSED = ['1', 'true', 'yes'].includes(
  String(process.env.TAIFUN_KEEP_PROCESSED || '').toLowerCase()
);

async function ensureDirs() {
  if (KEEP_PROCESSED) {
    await fs.mkdir(path.join(INBOX, 'processed'), { recursive: true });
  }
  await fs.mkdir(path.join(INBOX, 'failed'), { recursive: true });
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function importOne(fullPath, filename) {
  const buf = await fs.readFile(fullPath);
  // SFTP inbox pushes are DELTA — Bruno drops one or a few orders per file.
  // A full-export flag would nuke every order not in this single file.
  const result = await taifunSyncService.importXml(buf, {
    isFullExport: false,
    source: `sftp:${filename}`,
  });
  return result;
}

async function scanAndImport() {
  await ensureDirs();
  const entries = await fs.readdir(INBOX, { withFileTypes: true });
  const xmlFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.xml'))
    .map((e) => e.name);

  if (xmlFiles.length === 0) return { scanned: 0, ok: 0, failed: 0 };

  let ok = 0;
  let failed = 0;
  for (const name of xmlFiles) {
    const src = path.join(INBOX, name);
    const label = `${stamp()}_${name}`;
    try {
      const result = await importOne(src, name);
      // On success: delete the file so re-used names don't collide next export.
      // (Or archive to processed/ when TAIFUN_KEEP_PROCESSED is set.)
      if (KEEP_PROCESSED) {
        await fs.rename(src, path.join(INBOX, 'processed', label));
      } else {
        await fs.unlink(src);
      }
      ok++;
      logger.info('Taifun SFTP file imported', {
        file: name,
        imported: result?.imported,
        updated: result?.updated,
        skipped: result?.skipped,
      });
    } catch (err) {
      failed++;
      const dst = path.join(INBOX, 'failed', label);
      try { await fs.rename(src, dst); } catch {}
      try {
        await fs.writeFile(
          dst + '.error.txt',
          `Import fehlgeschlagen am ${new Date().toISOString()}\n\n${err.stack || err.message}\n`
        );
      } catch {}
      logger.error('Taifun SFTP file failed', { file: name, error: err.message });
    }
  }

  return { scanned: xmlFiles.length, ok, failed };
}

module.exports = { scanAndImport, INBOX };
