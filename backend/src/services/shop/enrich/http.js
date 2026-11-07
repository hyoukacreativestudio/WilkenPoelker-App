const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

// Small HTTP helper for reading official manufacturer pages, politely: one
// request at a time with a pause, honest user agent, no retries on 4xx.
const UA = 'Mozilla/5.0 (compatible; WilkenPoelker-Produktdaten/1.0; +https://wilpo.net)';
const PAUSE_MS = 700;
let last = 0;

async function politeFetch(url, { binary = false } = {}) {
  const wait = last + PAUSE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-DE,de;q=0.9' }, redirect: 'follow' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${url}`), { status: res.status });
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
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
