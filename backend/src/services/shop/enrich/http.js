const fs = require('fs').promises;
const path = require('path');
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
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const UPLOADS = path.resolve(__dirname, '../../../../uploads');

// Downloads official pictures and stores them as webp (large + thumbnail)
// under /uploads/shop/<folder>/. Returns [{ url, thumb, source }].
async function storeImages(folder, urls, source) {
  const dir = path.join(UPLOADS, 'shop', folder);
  await fs.mkdir(dir, { recursive: true });
  const out = [];
  for (const [i, url] of urls.entries()) {
    try {
      const buf = await politeFetch(url, { binary: true });
      const base = `${i + 1}`;
      await sharp(buf).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).webp({ quality: 82 }).toFile(path.join(dir, `${base}.webp`));
      await sharp(buf).rotate().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).webp({ quality: 78 }).toFile(path.join(dir, `${base}-k.webp`));
      out.push({ url: `/uploads/shop/${folder}/${base}.webp`, thumb: `/uploads/shop/${folder}/${base}-k.webp`, source, original: url });
    } catch (e) {
      // skip a broken picture, keep the others
    }
  }
  return out;
}

module.exports = { politeFetch, storeImages, UPLOADS };
