// Pictures for the website, all converted to WebP at build time:
//  - shop photos and team portraits from the app (frontend/assets)
//  - product pictures of the Taifun catalog (backend/uploads/shop, or over HTTP)
// File names carry a content hash, so unchanged pictures are neither converted
// nor uploaded again, and browsers may cache them for a long time.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { hash, sleep } = require('./util');

sharp.cache(false);
sharp.concurrency(2);

const REPO = path.resolve(__dirname, '..', '..', '..');
const ABOUT = path.join(REPO, 'frontend', 'assets', 'about');
const TEAM = path.join(REPO, 'frontend', 'assets', 'team');

function createImages({ out, api, uploadsDir, cacheDir, log = console.log }) {
  const done = new Map(); // output path -> promise (each picture once per build)
  const files = new Set(); // every picture this build uses (relative paths)
  let converted = 0;

  // Small pool: sharp is fast, but 1,500 pictures at once would eat the memory
  let running = 0;
  const queue = [];
  const pool = (fn) => new Promise((resolve, reject) => {
    const run = async () => {
      running += 1;
      try { resolve(await fn()); } catch (e) { reject(e); } finally {
        running -= 1;
        if (queue.length) queue.shift()();
      }
    };
    if (running < 4) run(); else queue.push(run);
  });

  async function encode(input, file, resize, quality) {
    files.add(file);
    const target = path.join(out, file);
    if (fs.existsSync(target)) return sharp(target).metadata().then((m) => ({ width: m.width, height: m.height }));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const info = await sharp(input).rotate().resize(resize).webp({ quality, effort: 5 }).toFile(target);
    converted += 1;
    return { width: info.width, height: info.height };
  }

  function once(key, fn) {
    if (!done.has(key)) done.set(key, pool(fn));
    return done.get(key);
  }

  // Shop photo in several widths for srcset. Returns { src, srcset, width, height }.
  function photo(name, widths = [640, 1024, 1600], quality = 72) {
    return once(`photo:${name}:${widths}`, async () => {
      const file = fs.readdirSync(ABOUT).find((f) => f.replace(/\.[^.]+$/, '') === name);
      if (!file) throw new Error(`Foto fehlt: ${name}`);
      const buf = fs.readFileSync(path.join(ABOUT, file));
      const h = hash(buf, 8);
      // A photo narrower than the largest width only gets the sizes it really
      // has (no copies under a larger name, no duplicate widths in srcset)
      const meta = await sharp(buf).metadata();
      const own = (meta.orientation || 1) >= 5 ? meta.height : meta.width;
      const usable = widths.filter((w) => w < own);
      if (usable.length < widths.length) usable.push(widths.find((w) => w >= own));
      const sizes = [];
      for (const w of usable) {
        const rel = `assets/img/foto/${name}-${h}-${w}.webp`;
        const dim = await encode(buf, rel, { width: w, withoutEnlargement: true }, quality);
        sizes.push({ rel, ...dim });
      }
      const big = sizes[sizes.length - 1];
      return {
        src: `/${sizes[Math.min(1, sizes.length - 1)].rel}`,
        srcset: sizes.map((s) => `/${s.rel} ${s.width}w`).join(', '),
        width: big.width,
        height: big.height,
        large: `/${big.rel}`,
      };
    });
  }

  // Team portrait (square). Placeholders of the app are skipped (initials instead).
  function portrait(image) {
    if (!image || /^placeholder/.test(image)) return Promise.resolve(null);
    return once(`team:${image}`, async () => {
      const src = path.join(TEAM, `${image}.jpg`);
      if (!fs.existsSync(src)) return null;
      const buf = fs.readFileSync(src);
      const h = hash(buf, 8);
      const big = `assets/img/team/${image}-${h}-360.webp`;
      const small = `assets/img/team/${image}-${h}-128.webp`;
      await encode(buf, big, { width: 360, height: 360, fit: 'cover', position: 'attention' }, 74);
      await encode(buf, small, { width: 128, height: 128, fit: 'cover', position: 'attention' }, 70);
      return { src: `/${big}`, small: `/${small}` };
    });
  }

  // Original of a product picture: from disk on the app server, else over HTTP
  // (kept in a cache folder between builds)
  async function productSource(url) {
    if (uploadsDir && url.startsWith('/uploads/')) {
      const f = path.join(uploadsDir, decodeURIComponent(url.slice('/uploads/'.length)));
      if (fs.existsSync(f)) return fs.readFileSync(f);
    }
    const full = /^https?:/.test(url) ? url : `${api}${url}`;
    fs.mkdirSync(cacheDir, { recursive: true });
    const file = path.join(cacheDir, hash(full, 16));
    const metaFile = `${file}.json`;
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch { /* not cached */ }
    const fresh = fs.existsSync(file) && Date.now() - (meta.checked || 0) < 6 * 3600 * 1000;
    if (fresh) return fs.readFileSync(file);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const res = await fetch(full, {
          headers: meta.etag && fs.existsSync(file) ? { 'If-None-Match': meta.etag } : {},
          signal: AbortSignal.timeout(30000),
        });
        if (res.status === 304) {
          fs.writeFileSync(metaFile, JSON.stringify({ ...meta, checked: Date.now() }));
          return fs.readFileSync(file);
        }
        if (res.status === 429 || res.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(file, buf);
        fs.writeFileSync(metaFile, JSON.stringify({ etag: res.headers.get('etag'), checked: Date.now() }));
        return buf;
      } catch {
        await sleep(2000 * (attempt + 1));
      }
    }
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  }

  // Product picture in two sizes: 480 (cards, thumbnails, search) and 1000
  // (product page, zoom). Returns null if the picture cannot be loaded.
  function product(slug, img) {
    return once(`product:${slug}:${img.url}`, async () => {
      const buf = await productSource(img.url);
      if (!buf) return null;
      const h = hash(buf, 10);
      const small = `produkte/bilder/${slug}/${h}-480.webp`;
      const big = `produkte/bilder/${slug}/${h}-1000.webp`;
      try {
        const s = await encode(buf, small, { width: 480, height: 480, fit: 'inside', withoutEnlargement: true }, 78);
        const b = await encode(buf, big, { width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }, 80);
        return { small: `/${small}`, big: `/${big}`, sw: s.width, sh: s.height, bw: b.width, bh: b.height, look: img.look || '' };
      } catch (e) {
        log(`  Bild übersprungen (${slug}): ${e.message}`);
        return null;
      }
    });
  }

  // Picture of a news post (feed of the app)
  function news(url) {
    return once(`news:${url}`, async () => {
      const buf = await productSource(url);
      if (!buf) return null;
      const h = hash(buf, 10);
      const rel = `assets/img/news/${h}-720.webp`;
      try {
        const d = await encode(buf, rel, { width: 720, height: 720, fit: 'inside', withoutEnlargement: true }, 74);
        return { src: `/${rel}`, width: d.width, height: d.height };
      } catch {
        return null;
      }
    });
  }

  return { photo, portrait, product, news, files: () => files, stats: () => ({ converted }) };
}

module.exports = { createImages };
