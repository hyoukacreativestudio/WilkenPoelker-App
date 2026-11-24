const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const sharp = require('sharp');

// Small HTTP helper for reading official manufacturer pages, politely: one
// request at a time with a pause, honest user agent, no retries on 4xx.
const UA = 'Mozilla/5.0 (compatible; WilkenPoelker-Produktdaten/1.0; +https://wilpo.net)';
const PAUSE_MS = 700;
let last = 0;

// Links come partly from staff (PC tool "Bild per Link"), so the server must not
// be talked into fetching its own or internal addresses (SSRF): only http(s) to
// public addresses, every redirect checked again, with a time and size limit.
const TIMEOUT_MS = 20000;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 5;

function isPublicAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
      || (a === 169 && b === 254) // link-local, cloud metadata
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0)
      || (a === 198 && (b === 18 || b === 19)));
  }
  // IPv6: only global unicast (2000::/3), without the ranges that tunnel or
  // embed IPv4 addresses (6to4, Teredo) and the documentation range. Mapped
  // IPv4 (::ffff:7f00:1 = 127.0.0.1) and everything else is refused.
  const v6 = ip.toLowerCase();
  if (!net.isIPv6(v6)) return false;
  return /^[23][0-9a-f]{0,3}:/.test(v6) && !/^2002:/.test(v6) && !/^2001:0{0,4}:/.test(v6) && !/^2001:0?db8:/.test(v6);
}

async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw Object.assign(new Error(`Ungültiger Link ${raw}`), { status: 400 }); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw Object.assign(new Error(`Nur http(s): ${raw}`), { status: 400 });
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addresses.length || !addresses.every((a) => isPublicAddress(a.address))) {
    throw Object.assign(new Error(`Interne Adresse nicht erlaubt: ${u.hostname}`), { status: 400 });
  }
  return u;
}

async function readLimited(res) {
  if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('Datei zu groß');
  const chunks = [];
  let size = 0;
  if (res.body) {
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error('Datei zu groß');
      chunks.push(Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks);
}

async function politeFetch(url, { binary = false } = {}) {
  const wait = last + PAUSE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  let current = url;
  for (let hop = 0; ; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'de-DE,de;q=0.9' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (hop >= MAX_REDIRECTS) throw new Error(`Zu viele Weiterleitungen ${url}`);
      current = new URL(res.headers.get('location'), current).href;
      continue;
    }
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${url}`), { status: res.status });
    const buf = await readLimited(res);
    return binary ? buf : buf.toString('utf8');
  }
}

// 404 / 410: the manufacturer removed it. Anything else (403 bot check, 5xx,
// no connection) says nothing about the file itself.
const isGone = (e) => e.status === 404 || e.status === 410;

const UPLOADS = path.resolve(__dirname, '../../../../uploads');

// Downloads official pictures and stores them as webp (large + thumbnail)
// under /uploads/shop/<folder>/. Returns [{ url, thumb, source }].
async function storeImages(folder, urls, source) {
  const out = [];
  for (const [i, url] of urls.entries()) {
    try {
      const buf = await politeFetch(url, { binary: true });
      out.push({ ...(await storeImageBuffer(folder, `${i + 1}`, buf)), source, original: url });
    } catch (e) {
      // skip a broken picture, keep the others
    }
  }
  return out;
}

// One picture (downloaded or uploaded from the PC tool) -> large + thumbnail webp.
// Throws if the data is not a readable image.
async function storeImageBuffer(folder, base, buf) {
  const dir = path.join(UPLOADS, 'shop', folder);
  await fs.mkdir(dir, { recursive: true });
  await sharp(buf).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).webp({ quality: 82 }).toFile(path.join(dir, `${base}.webp`));
  await sharp(buf).rotate().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).webp({ quality: 78 }).toFile(path.join(dir, `${base}-k.webp`));
  return { url: `/uploads/shop/${folder}/${base}.webp`, thumb: `/uploads/shop/${folder}/${base}-k.webp` };
}

// Monthly check: makes the stored pictures of a product match the manufacturer's
// current ones. Removed pictures are dropped (we only hold a licence for the current
// ones). If a picture cannot be checked, nothing is touched: { unknown: true }.
async function syncImages(folder, urls, source, current = []) {
  const downloads = [];
  for (const url of urls) {
    try {
      downloads.push({ url, buf: await politeFetch(url, { binary: true }) });
    } catch (e) {
      if (!isGone(e)) return { unknown: true };
    }
  }
  const known = new Map(current.map((img) => [img.original, img.hash]));
  const hashed = downloads.map((d) => ({ ...d, hash: crypto.createHash('sha1').update(d.buf).digest('hex') }));
  const same = hashed.length === current.length
    && hashed.every((d, i) => current[i]?.original === d.url && (!current[i].hash || current[i].hash === d.hash));

  const dir = path.join(UPLOADS, 'shop', folder);
  await fs.mkdir(dir, { recursive: true });
  const images = [];
  for (const [i, d] of hashed.entries()) {
    const base = `${i + 1}`;
    if (current[i]?.original !== d.url || known.get(d.url) !== d.hash) {
      await sharp(d.buf).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).webp({ quality: 82 }).toFile(path.join(dir, `${base}.webp`));
      await sharp(d.buf).rotate().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).webp({ quality: 78 }).toFile(path.join(dir, `${base}-k.webp`));
    }
    images.push({ url: `/uploads/shop/${folder}/${base}.webp`, thumb: `/uploads/shop/${folder}/${base}-k.webp`, source, original: d.url, hash: d.hash });
  }
  // Pictures that are no longer current must not stay on the server
  for (const f of await fs.readdir(dir)) {
    const m = f.match(/^(\d+)(-k)?\.webp$/);
    if (m && Number(m[1]) > images.length) await fs.unlink(path.join(dir, f)).catch(() => {});
  }
  return { images, changed: !same };
}

module.exports = { politeFetch, storeImages, storeImageBuffer, syncImages, isGone, UPLOADS };
