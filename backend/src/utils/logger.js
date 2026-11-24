const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logDir = path.resolve(__dirname, '../../logs');

// Data protection: the log files keep no full e-mail or IP addresses
// (privacy policy of the website and the app). E-mail addresses keep their
// first letter and the domain (enough to see which provider bounces), IPv4
// addresses lose the last part, IPv6 addresses everything after the third
// block. That is still enough to spot an attack from one network.
const EMAIL_RE = /([A-Za-z0-9])[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
const IPV4_RE = /\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}\b/g;
const IP_KEYS = new Set(['ip', 'ips', 'clientip', 'remoteip', 'ipaddress', 'remoteaddress', 'x-forwarded-for']);

function maskIp(value) {
  const s = String(value);
  if (s.includes('.')) return s.replace(IPV4_RE, '$1.0');
  if (s.includes(':')) return `${s.split(':').filter(Boolean).slice(0, 3).join(':')}::`;
  return s;
}
const maskText = (s) => s.replace(EMAIL_RE, '$1***@$2').replace(IPV4_RE, '$1.0');

function scrub(value, key = '', depth = 0) {
  if (typeof value === 'string') return IP_KEYS.has(String(key).toLowerCase()) ? maskIp(value) : maskText(value);
  if (depth > 4 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, key, depth + 1));
  // Only plain objects (never Sequelize instances, Buffers, Errors of callers)
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrub(v, k, depth + 1);
  return out;
}

// Changes only the string keys of the log entry (winston keeps its own data
// under symbols)
const redact = winston.format((info) => {
  for (const k of Object.keys(info)) {
    if (k !== 'level') info[k] = scrub(info[k], k);
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    redact(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'wilkenpoelker-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      ),
    })
  );
}

// Log files are kept for 14 days (privacy policy). Called by a nightly cron in
// app.js: files not written to since then go; in the others the older lines go.
const LOG_KEEP_DAYS = 14;
function pruneLogs({ dir = logDir, days = LOG_KEEP_DAYS, now = Date.now() } = {}) {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  // The timestamps in the files are local time of the server, like this one
  const pad = (n) => String(n).padStart(2, '0');
  const c = new Date(cutoff);
  const cutoffText = `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())} ${pad(c.getHours())}:${pad(c.getMinutes())}:${pad(c.getSeconds())}`;
  const result = { removed: 0, trimmed: 0 };
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return result; }
  for (const name of names) {
    if (!/\.log$/.test(name)) continue;
    const file = path.join(dir, name);
    try {
      const st = fs.statSync(file);
      if (!st.isFile()) continue;
      if (st.mtimeMs < cutoff) {
        fs.unlinkSync(file);
        result.removed += 1;
        continue;
      }
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      // Lines without a readable time (stack traces) stay with the line before
      let keep = true;
      const kept = lines.filter((line) => {
        const m = /"timestamp":"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)"/.exec(line);
        if (m) keep = m[1] >= cutoffText;
        return keep;
      });
      if (kept.length < lines.length) {
        fs.writeFileSync(file, kept.join('\n'));
        result.trimmed += 1;
      }
    } catch { /* next file */ }
  }
  return result;
}

module.exports = logger;
module.exports.pruneLogs = pruneLogs;
module.exports.scrub = scrub;
