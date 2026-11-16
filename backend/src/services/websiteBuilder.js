const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

// Keeps the company website up to date. The website itself stays at STRATO;
// this server only builds it (backend/website/build.js, from its own API: the
// Taifun products, opening hours, closed days, team) and uploads the changed
// files over SFTP (backend/website/upload.js).
//
// When: every night, a few minutes after a Taifun stock import, after changes to
// the opening hours or closed days, after product changes in the PC program, and
// when someone presses "Website aktualisieren" in the PC program. Changes that
// come in quick succession become one update.
//
// Setup (server .env, written by website/einrichten.sh = /root/website-einrichten.sh):
//   WEBSITE_SFTP_HOST, WEBSITE_SFTP_USER, WEBSITE_SFTP_PASSWORD, WEBSITE_SFTP_DIR
//   WEBSITE_MODE=test|live (test: every page "noindex", for wilpo.net)
//   optional WEBSITE_BASE (address in canonical links, default https://www.wilkenpoelker.de),
//   WEBSITE_API_PUBLIC (default https://api.wilkenpoelker.de), WEBSITE_AUTO=false (only by hand)

const BACKEND = path.resolve(__dirname, '..', '..');
const WEBSITE = path.join(BACKEND, 'website');
const OUT = path.join(WEBSITE, 'dist');
const CACHE = path.join(WEBSITE, '.cache');
const STATE_FILE = path.join(BACKEND, 'data', 'website-state.json');
const DEFAULT_DELAY = 3 * 60 * 1000;
const RUN_TIMEOUT = 45 * 60 * 1000;
const LOG_LINES = 80;

const { config: sftpConfig } = require('../../website/upload');

const state = {
  running: false,
  step: null,          // 'build' | 'upload'
  startedAt: null,
  reasons: [],
  scheduledFor: null,
  last: null,          // { startedAt, finishedAt, ok, reasons, summary, error }
  log: [],
};
let timer = null;
let pending = new Set();
let rerun = false;

try { state.last = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).last || null; } catch { /* first run */ }

const mode = () => (process.env.WEBSITE_MODE === 'live' ? 'live' : 'test');
const configured = () => sftpConfig().ready;
const automatic = () => configured() && process.env.WEBSITE_AUTO !== 'false';
// Same key as upload.js uses for its record of uploaded files
const target = () => { const c = sftpConfig(); return `${c.username}@${c.host}:${c.dir}`; };

function remember(line) {
  const text = String(line).trim();
  if (!text) return;
  state.log.push(text);
  if (state.log.length > LOG_LINES) state.log.splice(0, state.log.length - LOG_LINES);
}

// Runs one of the website scripts as its own process: a picture that breaks
// sharp or a dropped SFTP connection never takes the API down with it
function runScript(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--max-old-space-size=768', path.join(WEBSITE, file), ...args], {
      cwd: BACKEND,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Lower priority than the API, so the app stays fast while pictures are converted
    try { os.setPriority(child.pid, 10); } catch { /* not allowed */ }
    let lastLine = '';
    const onData = (buf) => String(buf).split(/\r?\n/).forEach((l) => { if (l.trim()) { lastLine = l.trim(); remember(l); } });
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const killer = setTimeout(() => { remember(`${file}: Zeitlimit überschritten, abgebrochen`); child.kill('SIGKILL'); }, RUN_TIMEOUT);
    child.on('error', (e) => { clearTimeout(killer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(killer);
      if (code === 0) resolve(lastLine);
      else reject(new Error(lastLine || `${file} endete mit Code ${code}`));
    });
  });
}

function save() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ last: state.last }));
  } catch (e) {
    logger.warn('Website state could not be saved', { error: e.message });
  }
}

async function run() {
  timer = null;
  state.scheduledFor = null;
  if (state.running) { rerun = true; return; }
  if (!configured()) { pending.clear(); return; }
  const reasons = [...pending];
  pending = new Set();
  state.running = true;
  state.startedAt = new Date().toISOString();
  state.reasons = reasons;
  state.log = [];
  const port = Number(process.env.PORT) || 5000;
  const result = { startedAt: state.startedAt, reasons, target: target() };
  try {
    state.step = 'build';
    const built = await runScript('build.js', [
      '--out', OUT,
      '--cache', CACHE,
      '--mode', mode(),
      '--api', `http://127.0.0.1:${port}`,
      '--api-public', process.env.WEBSITE_API_PUBLIC || 'https://api.wilkenpoelker.de',
      '--base', process.env.WEBSITE_BASE || 'https://www.wilkenpoelker.de',
      '--uploads', path.join(BACKEND, 'uploads'),
    ]);
    state.step = 'upload';
    const uploaded = await runScript('upload.js', ['--dir', OUT]);
    Object.assign(result, { ok: true, summary: `${built} ${uploaded}`.trim() });
    logger.info('Website updated', { reasons, built, uploaded });
  } catch (e) {
    Object.assign(result, { ok: false, step: state.step, error: e.message });
    logger.error('Website update failed', { reasons, step: state.step, error: e.message });
  } finally {
    result.finishedAt = new Date().toISOString();
    state.last = result;
    state.running = false;
    state.step = null;
    state.startedAt = null;
    state.reasons = [];
    save();
    // Something changed while this run was busy: one more round
    if (rerun || pending.size) {
      rerun = false;
      schedule(pending.size ? [...pending][0] : 'Änderung während der Aktualisierung', 60 * 1000);
    }
  }
}

// Asks for an update in delayMs (later requests within that time join it)
function schedule(reason, delayMs = DEFAULT_DELAY, { force = false } = {}) {
  if (!(force ? configured() : automatic())) return false;
  pending.add(reason);
  if (state.running) { rerun = true; return true; }
  const at = Date.now() + Math.max(0, delayMs);
  // An update that is already due earlier stays earlier
  if (timer && state.scheduledFor && new Date(state.scheduledFor).getTime() <= at) return true;
  clearTimeout(timer);
  timer = setTimeout(() => { run().catch((e) => logger.error('Website update crashed', { error: e.message })); }, Math.max(0, delayMs));
  if (timer.unref) timer.unref();
  state.scheduledFor = new Date(at).toISOString();
  return true;
}

// "Website aktualisieren" in the PC program: also when WEBSITE_AUTO=false
const runSoon = (reason) => schedule(reason, 2000, { force: true });

function status() {
  const cfg = sftpConfig();
  return {
    configured: cfg.ready,
    automatic: automatic(),
    mode: mode(),
    target: cfg.ready ? `${cfg.host}${cfg.dir}` : null,
    running: state.running,
    step: state.step,
    startedAt: state.startedAt,
    reasons: state.reasons,
    scheduledFor: state.scheduledFor,
    last: state.last,
    log: state.log.slice(-25),
  };
}

// Right after the setup (website/einrichten.sh), after a change of the web
// space and after a failed update: one update shortly after the start, without
// waiting for the night or the next change
if (automatic()) {
  const last = state.last;
  if (!last || last.target !== target()) schedule('Erste Aktualisierung nach der Einrichtung', 2 * 60 * 1000);
  else if (!last.ok) schedule('Neuer Versuch nach dem Neustart des Servers', 2 * 60 * 1000);
}

module.exports = { schedule, runSoon, status };
