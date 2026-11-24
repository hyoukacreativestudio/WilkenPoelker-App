const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { lang } = require('./i18n');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 1.234,50 € (non-breaking space, no rounding: the shop prices are exact to
// the cent); on the English pages €1,234.50
const euro = (v) => {
  if (v == null || Number.isNaN(Number(v))) return '';
  if (lang() === 'en') return `€${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
};

// Prices without cents where there are none: 319 € instead of 319,00 €
const euroShort = (v) => {
  if (v == null) return '';
  const n = Number(v);
  if (!Number.isInteger(n)) return euro(n);
  return lang() === 'en' ? `€${n.toLocaleString('en-GB')}` : `${n.toLocaleString('de-DE')} €`;
};

const slugify = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const hash = (buf, len = 10) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, len);

// JSON inside <script> tags
const json = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const plural = (n, one, many) => `${n.toLocaleString(lang() === 'en' ? 'en-GB' : 'de-DE')} ${n === 1 ? one : many}`;

const DAYS = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const dayName = (i) => DAYS[lang()][i];
// The date in the language of the page (the name stays: it was German only)
const dateDe = (iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang() === 'en' ? 'en-GB' : 'de-DE', { timeZone: 'Europe/Berlin', ...opts });
};

// Writes only when the content changed (keeps mtimes stable, quicker uploads)
function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  try {
    if (fs.readFileSync(file).equals(buf)) return false;
  } catch { /* new file */ }
  fs.writeFileSync(file, buf);
  return true;
}

function copyDir(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else writeFile(d, fs.readFileSync(s));
  }
}

// Shortens text at a word boundary (meta descriptions)
function clip(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[,;:.\s-]+$/, '')} …`;
}

// Page title within what search results show (about 65 characters): the
// first variant that fits, else the last one
function fitTitle(...variants) {
  const list = variants.filter(Boolean);
  return list.find((t) => t.length <= 65) || list[list.length - 1];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { esc, euro, euroShort, slugify, hash, json, plural, dayName, dateDe, writeFile, copyDir, clip, fitTitle, sleep };
