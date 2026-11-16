#!/usr/bin/env node
// Uploads a built website (build.js) to the web space at STRATO over SFTP.
//
//   node website/upload.js --dir <built folder> [--dry-run]
//   node website/upload.js --check                 (setup test, see einrichten.sh)
//   node website/upload.js --orphans <list.json>   (old files, see alte-dateien-entfernen.sh)
//   node website/upload.js --remove-orphans <list.json>
//
// Access data only from the environment (backend/.env on the app server):
//   WEBSITE_SFTP_HOST, WEBSITE_SFTP_PORT (22), WEBSITE_SFTP_USER,
//   WEBSITE_SFTP_PASSWORD, WEBSITE_SFTP_DIR (folder of the website: "/" for an
//   SFTP access whose start directory is the website folder, else e.g. /wilpo)
//
// Only files whose content changed since the last upload are sent: the build
// lists every file with a hash (.wp-build.json), this script remembers what it
// uploaded (.wp-upload.json in the same folder). Pictures, styles and scripts
// go first, pages after them and .htaccess, sitemap and robots.txt last, so a
// page never points to a file that is not there yet. Uploading never deletes
// anything on the web space; old files are only removed by --remove-orphans,
// which a person starts after seeing the list.
const fs = require('fs');
const path = require('path');

const MANIFEST = '.wp-build.json';
const STATE = '.wp-upload.json';
const LOCK = '.wp-upload.lock';
const LOCK_STALE_MS = 2 * 3600 * 1000;
const MISSING = 'SFTP-Zugang fehlt (WEBSITE_SFTP_HOST, _USER, _PASSWORD, _DIR)';
// Other projects on the same STRATO package: a folder that contains one of
// these is the whole web space, not the website folder
const FOREIGN = /^(wilpo|wordpress.*|fehntjer.*|preisschilder.*)$/i;
// Never removed: Google's verification files (Search Console, Play Console),
// hidden files and folders (.htaccess, .well-known, STRATO's own)
const keep = (rel) => /^google[0-9a-f]+\.html$/i.test(rel) || rel.split('/').some((part) => part.startsWith('.'));

function config(env = process.env) {
  const raw = String(env.WEBSITE_SFTP_DIR || '').trim();
  const c = {
    host: String(env.WEBSITE_SFTP_HOST || '').trim(),
    port: Number(env.WEBSITE_SFTP_PORT) || 22,
    username: String(env.WEBSITE_SFTP_USER || '').trim(),
    password: env.WEBSITE_SFTP_PASSWORD || '',
    // "/" stays "/", "/wilpo/" becomes "/wilpo"
    dir: raw.replace(/(.)\/+$/, '$1'),
  };
  return { ...c, ready: Boolean(c.host && c.username && c.password && c.dir) };
}

// Upload order: everything a page uses, then the pages, then the files that
// tell browsers and search engines what exists
function rank(rel) {
  if (rel === '.htaccess') return 4;
  if (rel === 'sitemap.xml' || rel === 'robots.txt') return 3;
  if (rel.endsWith('.html')) return 2;
  if (rel.endsWith('.json')) return 1;
  return 0;
}

// SFTP errors in words the staff understands (shown in the PC program)
function explain(message) {
  if (/authentication/i.test(message)) return 'Anmeldung am Webspace fehlgeschlagen, Benutzername oder Passwort stimmt nicht';
  if (/ENOTFOUND|getaddrinfo/i.test(message)) return 'Server des Webspace nicht gefunden (WEBSITE_SFTP_HOST prüfen)';
  if (/ECONNREFUSED/i.test(message)) return 'Verbindung zum Webspace abgelehnt (Adresse und Port prüfen)';
  if (/ETIMEDOUT|timed out|timeout/i.test(message)) return 'Der Webspace antwortet nicht, später erneut versuchen';
  if (/quota|no space|disk full/i.test(message)) return 'Auf dem Webspace ist kein Platz mehr frei';
  if (/permission denied/i.test(message)) return 'Keine Schreibrechte in diesem Ordner auf dem Webspace';
  return message;
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function takeLock(dir) {
  const file = path.join(dir, LOCK);
  try {
    const held = readJson(file, null);
    if (held && Date.now() - held.at < LOCK_STALE_MS) return null;
    fs.writeFileSync(file, JSON.stringify({ pid: process.pid, at: Date.now() }));
    return () => { try { fs.unlinkSync(file); } catch { /* gone */ } };
  } catch {
    return null;
  }
}

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

async function connect(cfg, name) {
  const SftpClient = require('ssh2-sftp-client');
  const sftp = new SftpClient(name);
  await sftp.connect({
    host: cfg.host, port: cfg.port, username: cfg.username, password: cfg.password,
    readyTimeout: 30000, retries: 2, retry_minTimeout: 3000,
  });
  const kind = await sftp.exists(cfg.dir);
  if (!kind || kind === '-') {
    await sftp.end().catch(() => {});
    throw new Error(`Ordner ${cfg.dir} gibt es auf dem Webspace nicht`);
  }
  return sftp;
}

async function upload({ dir, dryRun = false, log = console.log, env = process.env } = {}) {
  const out = path.resolve(dir);
  const cfg = config(env);
  const manifest = readJson(path.join(out, MANIFEST), null);
  if (!manifest || !manifest.files) throw new Error(`Kein Website-Build in ${out} (${MANIFEST} fehlt)`);
  if (!cfg.ready && !dryRun) throw new Error(MISSING);

  const target = `${cfg.username}@${cfg.host}:${cfg.dir}`;
  const stateFile = path.join(out, STATE);
  let state = readJson(stateFile, {});
  // Another web space or folder: everything is new there
  if (state.target !== target) state = { target, files: {} };
  state.files = state.files || {};

  const changed = Object.entries(manifest.files)
    .filter(([rel, h]) => state.files[rel] !== h && fs.existsSync(path.join(out, rel)))
    .map(([rel]) => rel)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const bytes = changed.reduce((n, rel) => n + fs.statSync(path.join(out, rel)).size, 0);

  if (!changed.length) {
    log('Website: nichts zu übertragen, alles aktuell');
    return { uploaded: 0, bytes: 0, unchanged: Object.keys(manifest.files).length };
  }
  if (dryRun) {
    log(`Website (Probelauf): ${changed.length} Dateien, ${mb(bytes)} würden übertragen`);
    changed.slice(0, 20).forEach((rel) => log(`  ${rel}`));
    return { uploaded: 0, wouldUpload: changed.length, bytes };
  }

  const release = takeLock(out);
  if (!release) throw new Error('Es läuft bereits ein Upload');
  const saveState = () => fs.writeFileSync(stateFile, JSON.stringify({ ...state, uploadedAt: new Date().toISOString() }));
  const started = Date.now();
  let sftp = null;
  let done = 0;
  let sent = 0;
  try {
    sftp = await connect(cfg, 'wp-website');
    const made = new Set([cfg.dir]);
    const ensureDir = async (remoteDir) => {
      if (made.has(remoteDir)) return;
      if (!(await sftp.exists(remoteDir))) await sftp.mkdir(remoteDir, true);
      made.add(remoteDir);
    };
    log(`Website: ${changed.length} Dateien (${mb(bytes)}) nach ${cfg.host}:${cfg.dir}`);
    for (const rel of changed) {
      const remote = path.posix.join(cfg.dir, rel);
      await ensureDir(path.posix.dirname(remote));
      await sftp.fastPut(path.join(out, rel), remote);
      state.files[rel] = manifest.files[rel];
      done += 1;
      sent += fs.statSync(path.join(out, rel)).size;
      // Progress is kept, so an interrupted upload continues where it stopped
      if (done % 50 === 0) {
        saveState();
        log(`  ${done}/${changed.length} Dateien`);
      }
    }
    saveState();
    const seconds = Math.round((Date.now() - started) / 1000);
    log(`Website hochgeladen: ${done} Dateien, ${mb(sent)} in ${seconds} s`);
    return { uploaded: done, bytes: sent, seconds };
  } catch (e) {
    if (done) saveState();
    throw new Error(`Upload abgebrochen nach ${done} von ${changed.length} Dateien: ${explain(e.message)}`);
  } finally {
    if (sftp) await sftp.end().catch(() => {});
    release();
  }
}

// Setup test (einrichten.sh): logs in, looks into the folder and writes one
// small test file there, which is removed again right away.
// Result: ok | 'no-google' (folder has no Google verification file, maybe the
// wrong folder) | 'webspace' (the folder holds other projects: the whole web space)
async function check({ env = process.env, log = console.log } = {}) {
  const cfg = config(env);
  if (!cfg.ready) throw new Error(MISSING);
  let sftp = null;
  try {
    sftp = await connect(cfg, 'wp-website-check');
    const entries = await sftp.list(cfg.dir);
    const names = entries.map((e) => e.name + (e.type === 'd' ? '/' : '')).sort((a, b) => a.localeCompare(b));
    log(`Anmeldung klappt: ${cfg.username}@${cfg.host}, Ordner ${cfg.dir} mit ${entries.length} Einträgen`);
    if (names.length) log(`  ${names.slice(0, 14).join('  ')}${names.length > 14 ? '  …' : ''}`);
    const foreign = entries.filter((e) => e.type === 'd' && FOREIGN.test(e.name)).map((e) => e.name);
    if (foreign.length) {
      log(`In diesem Ordner liegen andere Projekte (${foreign.join(', ')}): das ist der ganze Webspace, nicht der Ordner der Website.`);
      return { result: 'webspace', names };
    }
    const google = entries.find((e) => /^google[0-9a-f]+\.html$/i.test(e.name));
    if (!google) {
      // Maybe a wrong folder: nothing is written there before the person confirms
      log('Hinweis: In diesem Ordner liegt keine Google-Bestätigungsdatei (google….html), bei wilpo.net gehört sie dazu.');
      return { result: 'no-google', names };
    }
    log(`Google-Bestätigungsdatei gefunden (${google.name}), das ist der Ordner von wilpo.net.`);
    const probe = path.posix.join(cfg.dir, `.wp-upload-test-${process.pid}`);
    await sftp.put(Buffer.from('Test der Website-Einrichtung\n'), probe);
    await sftp.delete(probe);
    log('Schreiben in den Ordner klappt.');
    return { result: 'ok', names };
  } catch (e) {
    throw new Error(explain(e.message));
  } finally {
    if (sftp) await sftp.end().catch(() => {});
  }
}

// All files in the website folder on the web space that the current build
// does not contain (the old wilpo.net test site, ZIP parts of manual uploads).
async function findOrphans(sftp, cfg, manifest) {
  const found = [];
  const walk = async (remoteDir, prefix) => {
    for (const e of await sftp.list(remoteDir)) {
      const rel = prefix + e.name;
      if (keep(rel)) continue;
      if (e.type === 'd') await walk(path.posix.join(remoteDir, e.name), `${rel}/`);
      else if (!manifest.files[rel]) found.push({ rel, size: e.size || 0 });
    }
  };
  await walk(cfg.dir, '');
  return found.sort((a, b) => a.rel.localeCompare(b.rel));
}

async function orphanContext({ dir, env }) {
  const out = path.resolve(dir);
  const cfg = config(env);
  if (!cfg.ready) throw new Error(MISSING);
  const manifest = readJson(path.join(out, MANIFEST), null);
  if (!manifest || !manifest.files) throw new Error('Die neue Website wurde auf diesem Server noch nicht erstellt, erst danach lässt sich vergleichen');
  // Old pages are only removed once every file of the new website is online
  const uploaded = readJson(path.join(out, STATE), {});
  const sameTarget = uploaded.target === `${cfg.username}@${cfg.host}:${cfg.dir}`;
  const missing = Object.entries(manifest.files).filter(([rel, h]) => !sameTarget || uploaded.files?.[rel] !== h).length;
  if (missing) {
    throw new Error(`Die neue Website ist noch nicht vollständig auf diesem Webspace (${missing} Dateien fehlen noch), erst danach aufräumen`);
  }
  return { out, cfg, manifest };
}

// Grouped overview for the person who decides: folder → number of files, size
function describe(list, log) {
  const groups = new Map();
  for (const { rel, size } of list) {
    const top = rel.includes('/') ? `${rel.split('/')[0]}/` : (/\.zip$/i.test(rel) ? 'ZIP-Dateien' : 'Dateien direkt im Ordner');
    const g = groups.get(top) || { files: 0, size: 0, sample: [] };
    g.files += 1;
    g.size += size;
    if (g.sample.length < 3) g.sample.push(rel);
    groups.set(top, g);
  }
  for (const [name, g] of [...groups.entries()].sort((a, b) => b[1].files - a[1].files)) {
    log(`  ${name}: ${g.files} Dateien, ${mb(g.size)} (z. B. ${g.sample.join(', ')})`);
  }
}

async function orphans({ dir, listFile, env = process.env, log = console.log } = {}) {
  const { cfg, manifest } = await orphanContext({ dir, env });
  let sftp = null;
  try {
    sftp = await connect(cfg, 'wp-website-orphans');
    const top = await sftp.list(cfg.dir);
    if (top.some((e) => e.type === 'd' && FOREIGN.test(e.name))) {
      throw new Error(`Im Ordner ${cfg.dir} liegen andere Projekte, dort wird nichts aufgeräumt`);
    }
    if (!top.some((e) => /^google[0-9a-f]+\.html$/i.test(e.name))) {
      throw new Error(`Im Ordner ${cfg.dir} fehlt die Google-Bestätigungsdatei, das ist nicht der Ordner von wilpo.net. Es wird nichts aufgeräumt`);
    }
    const list = await findOrphans(sftp, cfg, manifest);
    if (listFile) fs.writeFileSync(listFile, JSON.stringify(list.map((f) => f.rel)));
    if (!list.length) {
      log('Keine alten Dateien gefunden, im Ordner liegt nur die neue Website.');
      return { files: 0, bytes: 0 };
    }
    const bytes = list.reduce((n, f) => n + f.size, 0);
    log(`${list.length} alte Dateien (${mb(bytes)}) gehören nicht zur neuen Website:`);
    describe(list, log);
    log('Bleiben auf jeden Fall: alle Dateien der neuen Website, die Google-Bestätigungsdatei, .htaccess und versteckte Ordner.');
    return { files: list.length, bytes };
  } catch (e) {
    throw new Error(explain(e.message));
  } finally {
    if (sftp) await sftp.end().catch(() => {});
  }
}

// Removes the files of a list made by orphans() that are still old files now
// (a file that became part of the website in between stays), then the folders
// that are empty afterwards
async function removeOrphans({ dir, listFile, env = process.env, log = console.log } = {}) {
  const { out, cfg, manifest } = await orphanContext({ dir, env });
  const wanted = new Set(readJson(listFile, []));
  if (!wanted.size) {
    log('Nichts zu löschen.');
    return { removed: 0 };
  }
  const release = takeLock(out);
  if (!release) throw new Error('Gerade läuft ein Upload, bitte später noch einmal');
  let sftp = null;
  let removed = 0;
  try {
    sftp = await connect(cfg, 'wp-website-cleanup');
    const top = await sftp.list(cfg.dir);
    if (top.some((e) => e.type === 'd' && FOREIGN.test(e.name)) || !top.some((e) => /^google[0-9a-f]+\.html$/i.test(e.name))) {
      throw new Error(`Der Ordner ${cfg.dir} ist nicht der Ordner der Website, es wird nichts gelöscht`);
    }
    const now = await findOrphans(sftp, cfg, manifest);
    const doomed = now.filter((f) => wanted.has(f.rel)).map((f) => f.rel);
    const dirs = new Set();
    for (const rel of doomed) {
      await sftp.delete(path.posix.join(cfg.dir, rel));
      removed += 1;
      for (let d = path.posix.dirname(rel); d !== '.'; d = path.posix.dirname(d)) dirs.add(d);
      if (removed % 100 === 0) log(`  ${removed}/${doomed.length} gelöscht`);
    }
    // Deepest folders first; a folder that still holds anything stays
    let folders = 0;
    for (const d of [...dirs].sort((a, b) => b.split('/').length - a.split('/').length || b.localeCompare(a))) {
      try {
        const remoteDir = path.posix.join(cfg.dir, d);
        if ((await sftp.list(remoteDir)).length === 0) { await sftp.rmdir(remoteDir); folders += 1; }
      } catch { /* not empty or already gone */ }
    }
    log(`Aufgeräumt: ${removed} alte Dateien gelöscht${folders ? `, ${folders} leere Ordner entfernt` : ''}.`);
    return { removed, folders };
  } catch (e) {
    throw new Error(`Aufräumen abgebrochen nach ${removed} Dateien: ${explain(e.message)}`);
  } finally {
    if (sftp) await sftp.end().catch(() => {});
    release();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const arg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
  try { require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true }); } catch { /* no dotenv */ }
  const dir = arg('dir', path.join(__dirname, 'dist'));
  const fail = (e) => { console.error(e.message); process.exit(1); };
  if (args.includes('--check')) {
    // Exit code for einrichten.sh: 0 fine, 2 no Google file, 3 whole web space
    check().then(({ result }) => process.exit({ ok: 0, 'no-google': 2, webspace: 3 }[result])).catch(fail);
  } else if (args.includes('--orphans')) {
    orphans({ dir, listFile: arg('orphans') }).catch(fail);
  } else if (args.includes('--remove-orphans')) {
    removeOrphans({ dir, listFile: arg('remove-orphans') }).catch(fail);
  } else {
    upload({ dir, dryRun: args.includes('--dry-run') }).catch(fail);
  }
}

module.exports = { upload, check, orphans, removeOrphans, config };
