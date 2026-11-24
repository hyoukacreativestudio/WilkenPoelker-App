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
const { setLang, L, MAIN_EN, DEVICE_EN, mainName, deviceName } = require('./lib/i18n');
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
      .map(([dname, count]) => ({
        name: dname, slug: slugify(dname), slugEn: slugify(DEVICE_EN[dname] || dname), count, url: `/produkte/${slug}/${slugify(dname)}.html`,
        get label() { return deviceName(dname); },
      }));
    const pick = [...list].sort(catalog.recommended).find((p) => p.available && productImages.get(p.slug)?.length)
      || list.find((p) => productImages.get(p.slug)?.length);
    return {
      name, slug, slugEn: slugify(MAIN_EN[name] || name), url: `/produkte/${slug}/`, count: list.length, icon: (MAIN[name] || {}).icon || 'box', devices,
      image: pick ? productImages.get(pick.slug)[0] : null,
      get label() { return mainName(name); },
    };
  });

  const brandCount = new Map();
  for (const p of products) if (p.brand) brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1);
  const brands = [...brandCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .map(([name, count]) => ({ name, count, slug: slugify(name), url: `/marken/${slugify(name)}.html` }));

  // German page -> English page. The templates link German addresses; the
  // English pass maps them (localize). Files: rel paths, links: URL paths.
  const EN_FILES = {
    'index.html': 'en/index.html',
    'produkte/index.html': 'en/products/index.html',
    'produkte/alle.html': 'en/products/all.html',
    'angebote.html': 'en/offers.html',
    'merkzettel.html': 'en/wishlist.html',
    'marken/index.html': 'en/brands/index.html',
    'fahrraeder.html': 'en/bikes.html',
    'e-bike-leasing.html': 'en/e-bike-leasing.html',
    'service.html': 'en/service.html',
    'ueber-uns.html': 'en/about-us.html',
    'karriere.html': 'en/careers.html',
    'app.html': 'en/app.html',
    'kontakt.html': 'en/contact.html',
    'impressum.html': 'en/legal-notice.html',
    'datenschutz.html': 'en/privacy.html',
    'barrierefreiheit.html': 'en/accessibility.html',
    '404.html': 'en/404.html',
  };
  for (const c of categories) {
    EN_FILES[`produkte/${c.slug}/index.html`] = `en/products/${c.slugEn}/index.html`;
    // A category with one device has no device page (German: a forward)
    if (c.devices.length > 1) for (const d of c.devices) EN_FILES[`produkte/${c.slug}/${d.slug}.html`] = `en/products/${c.slugEn}/${d.slugEn}.html`;
  }
  for (const b of brands) EN_FILES[`marken/${b.slug}.html`] = `en/brands/${b.slug}.html`;
  for (const p of products) EN_FILES[`produkte/p/${p.slug}.html`] = `en/products/p/${p.slug}.html`;
  if (new Set(Object.values(EN_FILES)).size !== Object.keys(EN_FILES).length) throw new Error('Englische Adressen doppelt vergeben');
  const urlPath = (rel) => `/${rel.replace(/index\.html$/, '')}`;
  const PATHS = new Map(Object.entries(EN_FILES).map(([de, en]) => [urlPath(de), urlPath(en)]));
  for (const c of categories) if (c.devices.length === 1) PATHS.set(c.devices[0].url, urlPath(EN_FILES[`produkte/${c.slug}/index.html`]));
  const toEn = (p) => PATHS.get(p) || p;
  const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // href="/kontakt.html?thema=x#y" and absolute addresses (JSON-LD, og:url)
  const hrefRe = /(href|data-href)="(\/[^"#?]*)([#?][^"]*)?"/g;
  // (an address with #, like the @id of the business, is the same in both languages)
  const absRe = new RegExp(`${reEsc(base)}(/[^"\\s<>#?]*)(#?)`, 'g');
  const localize = (html) => html
    .replace(hrefRe, (m, attr, p, rest = '') => (PATHS.has(p) ? `${attr}="${PATHS.get(p)}${rest}"` : m))
    .replace(absRe, (m, p, h) => (!h && PATHS.has(p) ? base + PATHS.get(p) : m));

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
    toEn, localize,
  };

  // 5. Pages, first German, then English (same templates, setLang)
  const sitemap = [];
  const deRelOf = new Map(Object.entries(EN_FILES).map(([de, en]) => [en, de]));
  const pageOut = (rel, html, { images: imgs = [], priority, index = true } = {}) => {
    put(rel, html);
    if (index) sitemap.push({ rel, images: imgs, priority });
  };
  // Pages of products that are no longer shown stay online as forwards
  // (bookmarks, search engines), so old prices never stay visible.
  const forwards = (prefix, overview) => {
    const re = new RegExp(`^${prefix}/p/[^/]+\\.html$`);
    for (const rel of Object.keys(previous.files || {})) {
      if (re.test(rel) && !files.has(rel)) put(rel, legal.forward(ctx, overview, L('Produkte', 'Products')));
    }
  };

  for (const lng of ['de', 'en']) {
    setLang(lng);
    const R = (deRel) => (lng === 'en' ? EN_FILES[deRel] : deRel);
    pageOut(R('index.html'), await homePages.home(ctx), { priority: '1.0' });
    pageOut(R('produkte/index.html'), catalog.overview(ctx), { priority: '0.9' });
    pageOut(R('produkte/alle.html'), catalog.all(ctx), { priority: '0.6' });
    for (const c of categories) {
      pageOut(R(`produkte/${c.slug}/index.html`), await catalog.category(ctx, c), { priority: '0.8' });
      if (c.devices.length > 1) {
        for (const d of c.devices) pageOut(R(`produkte/${c.slug}/${d.slug}.html`), catalog.device(ctx, c, d), { priority: '0.7' });
      } else if (c.devices.length === 1 && lng === 'de') {
        // Only one device in the category: its page would duplicate the category
        const d = c.devices[0];
        put(`produkte/${c.slug}/${d.slug}.html`, legal.forward(ctx, c.url, d.name));
      }
    }
    for (const p of products) {
      const imgs = (productImages.get(p.slug) || []).map((im) => im.big);
      pageOut(R(`produkte/p/${p.slug}.html`), catalog.productPage(ctx, p), { images: imgs, priority: '0.6' });
    }
    pageOut(R('angebote.html'), catalog.offersPage(ctx), { priority: '0.8' });
    pageOut(R('marken/index.html'), catalog.brandsIndex(ctx), { priority: '0.5' });
    for (const b of brands) pageOut(R(`marken/${b.slug}.html`), catalog.brandPage(ctx, b), { priority: '0.5' });
    pageOut(R('fahrraeder.html'), await info.bikes(ctx), { priority: '0.8' });
    pageOut(R('e-bike-leasing.html'), await info.leasing(ctx), { priority: '0.7' });
    pageOut(R('service.html'), await info.service(ctx), { priority: '0.8' });
    pageOut(R('ueber-uns.html'), await info.about(ctx), { priority: '0.7' });
    pageOut(R('karriere.html'), await info.career(ctx), { priority: '0.5' });
    pageOut(R('app.html'), info.app(ctx), { priority: '0.6' });
    pageOut(R('kontakt.html'), info.contact(ctx), { priority: '0.8' });
    pageOut(R('impressum.html'), legal.impressum(ctx), { priority: '0.2' });
    pageOut(R('datenschutz.html'), legal.datenschutz(ctx), { priority: '0.2' });
    pageOut(R('barrierefreiheit.html'), legal.barrierefreiheit(ctx), { priority: '0.2' });
    put(R('404.html'), legal.notFound(ctx));
    put(R('merkzettel.html'), catalog.wishlistPage(ctx));
    if (lng === 'de') put('sortiment.html', legal.forward(ctx, '/produkte/', 'Produkte'));
    forwards(lng === 'en' ? 'en/products' : 'produkte', lng === 'en' ? '/en/products/' : '/produkte/');

    // 6. Search index for the search sheet (all pages). English: the English
    // device name for the list, the German one at the end for matching.
    const search = products.map((p) => {
      const row = [p.slug, p.title, p.brand || '', p.device ? deviceName(p.device) : '', p.price ?? null, p.available ? 1 : 0, productImages.get(p.slug)?.[0]?.small || '', p.variantCount > 1 ? 1 : 0, ctx.deviceSlug(p)];
      if (lng === 'en') row.push(p.device || '');
      return row;
    });
    put(lng === 'en' ? 'en/products/search.json' : 'produkte/suche.json', JSON.stringify({ v: 1, items: search }));

    // Comparison data for the Merkzettel page: one file per device, so a
    // comparison of chain saws loads only the chain saws. The device slug
    // (German) is the same in both languages: one Merkzettel for both.
    const byDevice = new Map();
    for (const p of products) {
      const g = ctx.deviceSlug(p);
      if (!byDevice.has(g)) byDevice.set(g, { name: p.device ? deviceName(p.device) : (p.main ? mainName(p.main) : L('Sonstiges', 'Other')), items: [] });
      byDevice.get(g).items.push(catalog.compareItem(ctx, p));
    }
    for (const [g, grp] of byDevice) put(`${lng === 'en' ? 'en/products/compare' : 'produkte/vergleich'}/${g}.json`, JSON.stringify({ v: 1, name: grp.name, items: grp.items }));

    // Web app manifest: the website on the home screen of a phone
    const home = lng === 'en' ? '/en/' : '/';
    const u = (dePath) => (lng === 'en' ? toEn(dePath) : dePath);
    put(lng === 'en' ? 'en/manifest.webmanifest' : 'manifest.webmanifest', JSON.stringify({
      name: 'Wilken Poelker',
      short_name: 'Wilken Poelker',
      description: L('Fahrräder, Motorgeräte und Reinigungstechnik mit Werkstatt in Ostrhauderfehn', 'Bicycles, power tools and cleaning equipment with our own workshops in Ostrhauderfehn'),
      lang: lng,
      id: home,
      start_url: home,
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
        { name: L('Produkte', 'Products'), url: u('/produkte/') },
        { name: L('Angebote', 'Offers'), url: u('/angebote.html') },
        { name: L('Merkzettel', 'Wishlist'), url: u('/merkzettel.html') },
        { name: L('Werkstatt', 'Workshop'), url: u('/service.html') },
      ],
    }, null, 1));
  }
  setLang('de');

  // 7. Sitemap (lastmod only changes when the page changes), robots, .htaccess
  const today = new Date().toISOString().slice(0, 10);
  const lastmod = {};
  const urls = sitemap.map((s) => {
    const prev = previous.files?.[s.rel];
    const mod = prev && prev === files.get(s.rel) && previous.lastmod?.[s.rel] ? previous.lastmod[s.rel] : today;
    lastmod[s.rel] = mod;
    const imgs = s.images.slice(0, 10).map((src) => `<image:image><image:loc>${base}${src}</image:loc></image:image>`).join('');
    // Both languages of the page (hreflang, as in the pages themselves)
    const de = deRelOf.get(s.rel) || s.rel;
    const en = EN_FILES[de];
    const alt = en ? [['de', de], ['en', en], ['x-default', de]].map(([hl, rel]) => `<xhtml:link rel="alternate" hreflang="${hl}" href="${base}${urlPath(rel)}"/>`).join('') : '';
    return `<url><loc>${base}${urlPath(s.rel)}</loc>${alt}<lastmod>${mod}</lastmod>${s.priority ? `<priority>${s.priority}</priority>` : ''}${imgs}</url>`;
  });
  put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);
  put('robots.txt', mode === 'live'
    ? `User-agent: *\nAllow: /\nDisallow: /produkte/suche.json\nDisallow: /en/products/search.json\n\nSitemap: ${base}/sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n# Testseite: alle Seiten sind mit noindex markiert\n');
  put('.htaccess', htaccess({ mode, base, categories, productRoot: [...files.keys()].filter((rel) => /^produkte\/[^/]+\.html$/.test(rel)) }));
  // English 404 page for addresses below /en/ (own file there, no <If> needed)
  put('en/.htaccess', '# Wilken Poelker – erzeugt von backend/website/build.js\nErrorDocument 404 /en/404.html\n');
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
Header always set Content-Security-Policy "frame-ancestors 'self'"
Header always set Cross-Origin-Opener-Policy "same-origin-allow-popups"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
${mode === 'live' ? '# Browsers only accept this over https; one year, without subdomains (api. has its own)\nHeader always set Strict-Transport-Security "max-age=31536000"\n' : ''}
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
