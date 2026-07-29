const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const taifunSyncService = require('./taifunSyncService');

// Where Bruno's SFTP user drops XML files. Cron picks them up, imports each,
// then moves it to processed/ (success) or failed/ (with a .txt error log).
const INBOX = process.env.TAIFUN_INBOX || '/apps/wpapp/inbox/taifun';

async function ensureDirs() {
  await fs.mkdir(path.join(INBOX, 'processed'), { recursive: true });
  await fs.mkdir(path.join(INBOX, 'failed'), { recursive: true });
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function importOne(fullPath, filename) {
  const buf = await fs.readFile(fullPath);
  const result = await taifunSyncService.importXml(buf, {
    isFullExport: true,
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
      await fs.rename(src, path.join(INBOX, 'processed', label));
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
