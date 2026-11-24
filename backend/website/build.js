#!/usr/bin/env node
// Builds the company website (www.wilkenpoelker.de, test: wilpo.net) from the
// app's public API: products of the Taifun catalog, opening hours, team, news.
//
//   node website/build.js --out <folder> [--mode test|live] [--api <url>]
//        [--api-public <url>] [--base <url>] [--uploads <backend/uploads>] [--cache <folder>]
//
// --mode test (default): every page "noindex" (test domain wilpo.net)
// --mode live: indexable, www.wilkenpoelker.de as the only host
// --api: where the build reads the data (on the app server http://127.0.0.1:<PORT>)
// --api-public: what the visitors' browsers call (live status, reviews, forms)
// --uploads: product pictures straight from disk instead of over HTTP
//
// The output folder is kept between builds: pictures are only converted once,
// and .wp-build.json lists every file with its hash (for upload.js).
const fs = require('fs');
const path = require('path');
const { loadAll } = require('./lib/data');
const { createImages } = require('./lib/images');
const { writeFile, hash, slugify, json } = require('./lib/util');
const { MAIN, OLD_PAGES, OLD_CATEGORIES, COMPANY } = require('./lib/content');
const homePages = require('./lib/pages/home');
const catalog = require('./lib/pages/catalog');
const info = require('./lib/pages/info');
const legal = require('./lib/pages/legal');

const MANIFEST = '.wp-build.json';
const STATIC = path.join(__dirname, 'static');

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

async function build(opts) {
  const log = opts.log || console.log;
  const out = path.resolve(opts.out);
  const mode = opts.mode === 'live' ? 'live' : 'test';
  const base = String(opts.base || 'https://www.wilkenpoelker.de').replace(/\/+$/, '');
  const api = String(opts.api || 'https://api.wilkenpoelker.de').replace(/\/+$/, '');
  const apiPublic = String(opts.apiPublic || 'https://api.wilkenpoelker.de').replace(/\/+$/, '');
  const cacheDir = path.resolve(opts.cache || path.join(__dirname, '.cache'));
  const started = Date.now();

  fs.mkdirSync(out, { recursive: true });
  let previous = {};
  try { previous = JSON.parse(fs.readFileSync(path.join(out, MANIFEST), 'utf8')); } catch { /* first build */ }

  const files = new Map(); // relative path -> content hash
  const put = (rel, content) => {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    writeFile(path.join(out, rel), buf);
    files.set(rel, hash(buf, 16));
  };

  // 1. Static files (fonts, logos, styles, scripts)
  const assetHash = {};
  for (const rel of listFiles(STATIC)) {
    const buf = fs.readFileSync(path.join(STATIC, rel));
    put(rel, buf);
    assetHash[rel] = hash(buf, 8);
  }

  // 2. Data from the app's API
  // --data <file>: reuse the API data of an earlier run (only for working on the design)
  let data;
  if (opts.dataFile && fs.existsSync(opts.dataFile)) {
    data = JSON.parse(fs.readFileSync(opts.dataFile, 'utf8'));
    log(`Daten aus ${opts.dataFile}`);
  } else {
    log(`Daten von ${api} …`);
    data = await loadAll({ api, log });
    if (opts.dataFile) fs.writeFileSync(opts.dataFile, JSON.stringify(data));
  }
  const products = data.products.filter((p) => p && p.slug && p.title);
  if (!products.length) throw new Error('Keine Produkte erhalten, Abbruch (die Website bleibt unverändert)');

  // 3. Pictures
  const images = createImages({ out, api: data.api, uploadsDir: opts.uploads, cacheDir, log });
  const productImages = new Map();
  log(`Produktbilder für ${products.length} Produkte …`);
  await Promise.all(products.map(async (p) => {
    const list = await Promise.all((p.images || []).map((img) => images.product(p.slug, img)));
    productImages.set(p.slug, list.filter(Boolean));
  }));

  // 4. Categories in the app's order, devices by number of products
  const order = data.mainOrder.length ? data.mainOrder : Object.keys(MAIN);
  const byMain = new Map();
  for (const p of products) {
    const m = p.main || 'Zubehör';
    if (!byMain.has(m)) byMain.set(m, []);
    byMain.get(m).push(p);
  }
  const mains = [...byMain.keys()].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const categories = mains.map((name) => {
    const list = byMain.get(name);
    const slug = slugify(name);
    const devCount = new Map();
    for (const p of list) if (p.device) devCount.set(p.device, (devCount.get(p.device) || 0) + 1);
    const devices = [...devCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
      .map(([dname, count]) => ({ name: dname, slug: slugify(dname), count, url: `/produkte/${slug}/${slugify(dname)}.html` }));
    const pick = [...list].sort(catalog.recommended).find((p) => p.available && productImages.get(p.slug)?.length)
      || list.find((p) => productImages.get(p.slug)?.length);
    return {
      name, slug, url: `/produkte/${slug}/`, count: list.length, icon: (MAIN[name] || {}).icon || 'box', devices,
      image: pick ? productImages.get(pick.slug)[0] : null,
    };
  });

  const brandCount = new Map();
  for (const p of products) if (p.brand) brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1);
  const brands = [...brandCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .map(([name, count]) => ({ name, count, slug: slugify(name), url: `/marken/${slugify(name)}.html` }));

  // Pictures for the business in search results and the default share picture
  const track = await images.photo('outdoor4');
  const businessImages = [track.large, (await images.photo('outdoor5')).large, (await images.photo('laden14')).large];

  const ctx = {
    mode, base, apiPublic,
    asset: (rel) => `/${rel}?v=${assetHash[rel] || '0'}`,
    products, productImages, categories, brands,
    brandSlug: (b) => slugify(b),
    deviceSlug: (p) => slugify(p.device || p.main || 'Sonstiges'),
    hours: data.hours, closedDays: data.closedDays, team: data.team, news: data.news,
    images, businessImages, ogDefault: track.large,
  };

  // 5. Pages
  const sitemap = [];
  const pageOut = (rel, html, { images: imgs = [], priority, index = true } = {}) => {
    put(rel, html);
    if (index) sitemap.push({ rel, images: imgs, priority });
  };
  const urlPath = (rel) => `/${rel.replace(/index\.html$/, '')}`;

  pageOut('index.html', await homePages.home(ctx), { priority: '1.0' });
  pageOut('produkte/index.html', catalog.overview(ctx), { priority: '0.9' });
  pageOut('produkte/alle.html', catalog.all(ctx), { priority: '0.6' });
  for (const c of categories) {
    pageOut(`produkte/${c.slug}/index.html`, await catalog.category(ctx, c), { priority: '0.8' });
    if (c.devices.length > 1) {
      for (const d of c.devices) pageOut(`produkte/${c.slug}/${d.slug}.html`, catalog.device(ctx, c, d), { priority: '0.7' });
    } else if (c.devices.length === 1) {
      // Only one device in the category: its page would duplicate the category
      const d = c.devices[0];
      put(`produkte/${c.slug}/${d.slug}.html`, legal.forward(ctx, c.url, d.name));
    }
  }
  for (const p of products) {
    const imgs = (productImages.get(p.slug) || []).map((im) => im.big);
    pageOut(`produkte/p/${p.slug}.html`, catalog.productPage(ctx, p), { images: imgs, priority: '0.6' });
  }
  pageOut('angebote.html', catalog.offersPage(ctx), { priority: '0.8' });
  pageOut('marken/index.html', catalog.brandsIndex(ctx), { priority: '0.5' });
  for (const b of brands) pageOut(`marken/${b.slug}.html`, catalog.brandPage(ctx, b), { priority: '0.5' });
  pageOut('fahrraeder.html', await info.bikes(ctx), { priority: '0.8' });
  pageOut('e-bike-leasing.html', await info.leasing(ctx), { priority: '0.7' });
  pageOut('service.html', await info.service(ctx), { priority: '0.8' });
  pageOut('ueber-uns.html', await info.about(ctx), { priority: '0.7' });
  pageOut('karriere.html', await info.career(ctx), { priority: '0.5' });
  pageOut('app.html', info.app(ctx), { priority: '0.6' });
  pageOut('kontakt.html', info.contact(ctx), { priority: '0.8' });
  pageOut('impressum.html', legal.impressum(ctx), { priority: '0.2' });
  pageOut('datenschutz.html', legal.datenschutz(ctx), { priority: '0.2' });
  put('404.html', legal.notFound(ctx));
  put('sortiment.html', legal.forward(ctx, '/produkte/', 'Produkte'));
  put('merkzettel.html', catalog.wishlistPage(ctx));

  // Pages of products that are no longer shown stay online as forwards
  // (bookmarks, search engines), so old prices never stay visible.
  for (const rel of Object.keys(previous.files || {})) {
    if (/^produkte\/p\/[^/]+\.html$/.test(rel) && !files.has(rel)) {
      put(rel, legal.forward(ctx, '/produkte/', 'Produkte'));
    }
  }

  // 6. Search index for the search sheet (all pages)
  const search = products.map((p) => [p.slug, p.title, p.brand || '', p.device || '', p.price ?? null, p.available ? 1 : 0, productImages.get(p.slug)?.[0]?.small || '', p.variantCount > 1 ? 1 : 0, ctx.deviceSlug(p)]);
  put('produkte/suche.json', JSON.stringify({ v: 1, items: search }));

  // Comparison data for the Merkzettel page: one file per device, so a
  // comparison of chain saws loads only the chain saws
  const byDevice = new Map();
  for (const p of products) {
    const g = ctx.deviceSlug(p);
    if (!byDevice.has(g)) byDevice.set(g, { name: p.device || p.main || 'Sonstiges', items: [] });
    byDevice.get(g).items.push(catalog.compareItem(ctx, p));
  }
  for (const [g, grp] of byDevice) put(`produkte/vergleich/${g}.json`, JSON.stringify({ v: 1, name: grp.name, items: grp.items }));

  // Web app manifest: the website on the home screen of a phone
  put('manifest.webmanifest', JSON.stringify({
    name: 'Wilken Poelker',
    short_name: 'Wilken Poelker',
    description: 'Fahrräder, Motorgeräte und Reinigungstechnik mit Werkstatt in Ostrhauderfehn',
    lang: 'de',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/assets/img/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/img/pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/assets/img/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Produkte', url: '/produkte/' },
      { name: 'Angebote', url: '/angebote.html' },
      { name: 'Merkzettel', url: '/merkzettel.html' },
      { name: 'Werkstatt', url: '/service.html' },
    ],
  }, null, 1));

  // 7. Sitemap (lastmod only changes when the page changes), robots, .htaccess
  const today = new Date().toISOString().slice(0, 10);
  const lastmod = {};
  const urls = sitemap.map((s) => {
    const prev = previous.files?.[s.rel];
    const mod = prev && prev === files.get(s.rel) && previous.lastmod?.[s.rel] ? previous.lastmod[s.rel] : today;
    lastmod[s.rel] = mod;
    const imgs = s.images.slice(0, 10).map((src) => `<image:image><image:loc>${base}${src}</image:loc></image:image>`).join('');
    return `<url><loc>${base}${urlPath(s.rel)}</loc><lastmod>${mod}</lastmod>${s.priority ? `<priority>${s.priority}</priority>` : ''}${imgs}</url>`;
  });
  put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);
  put('robots.txt', mode === 'live'
    ? `User-agent: *\nAllow: /\nDisallow: /produkte/suche.json\n\nSitemap: ${base}/sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n# Testseite: alle Seiten sind mit noindex markiert\n');
  put('.htaccess', htaccess({ mode, base, categories, productRoot: [...files.keys()].filter((rel) => /^produkte\/[^/]+\.html$/.test(rel)) }));
  put('.well-known/apple-app-site-association', JSON.stringify({ webcredentials: { apps: ['H4F74FKLCG.com.hyoukacreativestudios.wilkenpoelker'] } }));

  // 8. Remove files of earlier builds that are no longer used (only files this
  // generator wrote itself, never anything else in the folder)
  const pictures = images.files();
  for (const rel of pictures) if (!files.has(rel)) files.set(rel, hash(fs.readFileSync(path.join(out, rel)), 16));
  let removed = 0;
  for (const rel of Object.keys(previous.files || {})) {
    if (files.has(rel)) continue;
    try { fs.unlinkSync(path.join(out, rel)); removed += 1; } catch { /* already gone */ }
  }
  // Folders that are empty now (pictures of products that are gone)
  const pruneEmpty = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) pruneEmpty(path.join(dir, e.name));
    if (dir !== out && !fs.readdirSync(dir).length) fs.rmdirSync(dir);
  };
  try { pruneEmpty(out); } catch { /* only tidiness */ }

  const manifest = {
    builtAt: new Date().toISOString(), mode, base, products: products.length,
    files: Object.fromEntries([...files.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    lastmod,
  };
  fs.writeFileSync(path.join(out, MANIFEST), JSON.stringify(manifest, null, 1));
  const seconds = Math.round((Date.now() - started) / 1000);
  log(`Fertig in ${seconds} s: ${sitemap.length} Seiten, ${products.length} Produkte, ${files.size} Dateien, ${images.stats().converted} Bilder neu umgewandelt${removed ? `, ${removed} alte Dateien entfernt` : ''} (${mode === 'live' ? 'live' : 'Testmodus, noindex'})`);
  return manifest;
}

// Apache rules for STRATO: caching, compression, 404 page, old addresses
function htaccess({ mode, base, categories, productRoot = [] }) {
  const host = base.replace(/^https?:\/\//, '');
  const target = (main, device) => {
    const c = categories.find((x) => x.name === main);
    if (!c) return '/produkte/';
    const d = device && c.devices.length > 1 ? c.devices.find((x) => x.name === device) : null;
    return d ? d.url : c.url;
  };
  const old = OLD_PAGES.map(([re, to]) => `RewriteRule ^${re}$ ${to}? [R=301,L,NE]`);
  for (const [slug, [main, device]] of Object.entries(OLD_CATEGORIES)) {
    old.push(`RewriteRule ^produkte/(?:.+/)?${slug.replace(/-/g, '\\-')}\\.[0-9a-f]+\\.de\\.html$ ${target(main, device)}? [R=301,L,NE]`);
  }
  old.push('RewriteRule ^produkte/[^/]+\\.[0-9a-f]+\\.de\\.html$ /produkte/? [R=301,L]');
  old.push('RewriteRule ^[^/]+\\.[0-9a-f]+\\.de\\.html$ /? [R=301,L]');
  // Earlier pages of the wilpo.net test site (produkte/<name>.html, until
  // 2026-11): categories to the new category, products to the overview. The
  // pages this build has directly in produkte/ stay as they are.
  old.push('# Frühere Seiten der Testseite wilpo.net');
  for (const [slug, [main, device]] of Object.entries(OLD_CATEGORIES)) {
    const rel = `produkte/${slug}.html`;
    if (!productRoot.includes(rel)) old.push(`RewriteRule ^produkte/${slug.replace(/-/g, '\\-')}\\.html$ ${target(main, device)}? [R=301,L,NE]`);
  }
  const ownPages = productRoot.map((rel) => rel.slice('produkte/'.length).replace(/\.html$/, '').replace(/[.-]/g, '\\$&'));
  old.push(`RewriteRule ^produkte/${ownPages.length ? `(?!(?:${ownPages.join('|')})\\.html$)` : ''}[^/]+\\.html$ /produkte/? [R=301,L]`);
  return `# Wilken Poelker – erzeugt von backend/website/build.js (${mode === 'live' ? 'live' : 'Testmodus'})
AddDefaultCharset utf-8
DirectoryIndex index.html
ErrorDocument 404 /404.html
Options -Indexes
AddType image/webp .webp
AddType font/woff2 .woff2
AddType image/svg+xml .svg
AddType application/json .json
AddType application/manifest+json .webmanifest
<Files "apple-app-site-association">
ForceType application/json
</Files>
<Files ".wp-build.json">
Require all denied
</Files>

<IfModule mod_headers.c>
${mode === 'live' ? '' : 'Header set X-Robots-Tag "noindex, nofollow"\n'}Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
<FilesMatch "\\.html$">
Header set Cache-Control "no-cache"
</FilesMatch>
<FilesMatch "\\.(css|js)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\\.(webp|jpg|jpeg|png|svg|ico|woff2)$">
Header set Cache-Control "public, max-age=2592000"
</FilesMatch>
<FilesMatch "(^|-)[0-9a-f]{8,}-[0-9]+\\.webp$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\\.(json|webmanifest)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json image/svg+xml text/xml application/xml text/plain
</IfModule>

<IfModule mod_rewrite.c>
RewriteEngine On
${mode === 'live' ? `# Nur eine Adresse: https://${host} (Google-Bestätigungsdateien und .well-known bleiben überall erreichbar)
RewriteCond %{REQUEST_URI} !^/google[0-9a-f]+\\.html$
RewriteCond %{REQUEST_URI} !^/\\.well-known/
RewriteCond %{HTTP_HOST} !^${host.replace(/\./g, '\\.')}$ [NC]
RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]
# Ohne https (auch hinter einem Proxy, der https schon erledigt hat, keine Schleife)
RewriteCond %{REQUEST_URI} !^/google[0-9a-f]+\\.html$
RewriteCond %{REQUEST_URI} !^/\\.well-known/
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !^https$ [NC]
RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]
` : ''}
# Alte Adressen von www.wilkenpoelker.de
${old.join('\n')}
</IfModule>
`;
}

// ── Command line ──────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const arg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
  build({
    out: arg('out', path.join(__dirname, 'dist')),
    mode: arg('mode', 'test'),
    api: arg('api', 'https://api.wilkenpoelker.de'),
    apiPublic: arg('api-public', 'https://api.wilkenpoelker.de'),
    base: arg('base', 'https://www.wilkenpoelker.de'),
    uploads: arg('uploads', null),
    cache: arg('cache', null),
    dataFile: arg('data', null),
  }).catch((e) => { console.error(`Website-Build fehlgeschlagen: ${e.message}`); process.exit(1); });
}

module.exports = { build, MANIFEST, COMPANY, json };
