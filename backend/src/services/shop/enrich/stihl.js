const { politeFetch } = require('./http');

// STIHL: the Taifun article number is "STI-" + the STIHL material number
// (e.g. STI-MA032000085). stihl.de product pages list the material numbers of
// all their variants in their JSON-LD data, so a page only counts as a match
// when it contains exactly our number - never by name alone.

const SITEMAP = 'https://www.stihl.de/sitemap.xml';
let sitemap = null;
let sitemapAt = 0;

async function productUrls() {
  if (sitemap && Date.now() - sitemapAt < 24 * 3600 * 1000) return sitemap;
  const xml = await politeFetch(SITEMAP);
  sitemap = [...xml.matchAll(/<loc>(https:\/\/www\.stihl\.de\/de\/(?:p|ap)\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  sitemapAt = Date.now();
  return sitemap;
}

function materialNumber(artNr) {
  const m = String(artNr || '').toUpperCase().match(/^J?STI-?(.+)$/);
  return m ? m[1].replace(/[^A-Z0-9]/g, '') : null;
}

// "MSA 220 C-B" -> "msa-220": the type designation used in stihl.de slugs
function slugToken(model) {
  const words = String(model || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return null;
  const take = /\d/.test(words[0]) ? 1 : 2;
  return words.slice(0, take).join('-');
}

const pageCache = new Map();
// The monthly check must read what the manufacturer shows today
function clearCache() {
  pageCache.clear();
  sitemap = null;
}

async function readPage(url) {
  if (pageCache.has(url)) return pageCache.get(url);
  const html = await politeFetch(url);
  const page = parsePage(url, html);
  pageCache.set(url, page);
  if (pageCache.size > 300) pageCache.delete(pageCache.keys().next().value);
  return page;
}

const decode = (s) => String(s || '')
  .replace(/<sup[^>]*>.*?<\/sup>/gs, '').replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

function readState(html) {
  const m = html.match(/__PRELOADED_STATE__="([A-Za-z0-9+/=]+)"/);
  if (!m) return null;
  try {
    return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'))?.currentProduct?.model || null;
  } catch {
    return null;
  }
}

// Product photos first, then pictures in use
const imageRank = (a) => ({ MODELL_LANDSCAPE: 0, MODEL_LANDSCAPE: 0, MODEL_APPLICATION: 1 }[a?.imageType] ?? 2);

// "3.76 / 3.68" -> "3,76 / 3,68" (only plain numbers - not "AP 200.0 P")
const germanNumber = (v) => {
  const s = String(v).trim();
  return /^[\d.]+(\s*\/\s*[\d.]+)*$/.test(s) ? s.replace(/\./g, ',') : s;
};

function parsePage(url, html) {
  let ld = null;
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (j['@type'] === 'Product') { ld = j; break; }
    } catch { /* other JSON-LD blocks */ }
  }
  const skus = new Set();
  const models = Array.isArray(ld?.model) ? ld.model : [];
  const variantNames = models.map((v) => v?.name).filter(Boolean);
  models.forEach((v) => v?.sku && skus.add(String(v.sku).toUpperCase().replace(/[^A-Z0-9]/g, '')));
  if (ld?.sku) skus.add(String(ld.sku).toUpperCase().replace(/[^A-Z0-9]/g, ''));

  // Full data (all technical values, pictures by type) is embedded as base64 JSON
  const state = readState(html);
  if (state) {
    const specs = (state.features || [])
      .filter((f) => f?.name && f.value != null && String(f.value).trim() !== '')
      .map((f) => [String(f.name).trim(), `${germanNumber(f.value)}${f.unit ? ` ${f.unit}` : ''}`.trim()]);
    const assets = [...(state.assets || [])].sort((a, b) => imageRank(a) - imageRank(b));
    const images = [...new Set(assets.map((a) => a?.url).filter((u) => /^\/content\/dam\/stihl\/media\/pim\/\d+\.(jpg|png)$/.test(u || '')))]
      .slice(0, 8).map((u) => `https://www.stihl.de${u}`);
    if (specs.length || images.length) return { url, name: ld?.name || state.name || null, variantNames, skus, images, specs };
  }

  const gStart = html.indexOf('<product-image-gallery-component');
  const gEnd = html.indexOf('</product-image-gallery-component>', gStart);
  const gallery = gStart >= 0 ? html.slice(gStart, gEnd > 0 ? gEnd : gStart + 200000) : '';
  const ids = [...new Set([...gallery.matchAll(/\/content\/dam\/stihl\/media\/pim\/(\d+)\.(jpg|png)/g)].map((m) => `${m[1]}.${m[2]}`))];
  const images = ids.slice(0, 8).map((id) => `https://www.stihl.de/content/dam/stihl/media/pim/${id}`);
  if (!images.length && typeof ld?.image === 'string') images.push(ld.image);

  const specs = [];
  const t = html.indexOf('pdp-spec-tech-table');
  if (t > 0) {
    const table = html.slice(t, html.indexOf('</table>', t));
    for (const row of table.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)) {
      const label = decode(row[1]);
      const value = decode(row[2]);
      if (label && value) specs.push([label, value]);
    }
  }
  return { url, name: ld?.name || null, variantNames, skus, images, specs };
}

// articles: the variants of one product (same STIHL type). Returns page data
// for the first article whose material number is found, or null.
async function findOfficial(product, articles) {
  const numbers = articles.map((a) => materialNumber(a.artNr)).filter(Boolean);
  if (!numbers.length) return null;
  // No "Modell:" line in Taifun: take the type designation from the name ("BGA 60")
  const designation = product.model || (String(product.title || '').match(/\b([A-Za-z]{2,4}[ -]?\d{2,4})\b/) || [])[1];
  const token = slugToken(designation);
  if (!token) return null;
  const re = new RegExp(`[/-]${token.replace(/[-]/g, '-')}-`);
  const urls = (await productUrls()).filter((u) => re.test(u.split('/').pop()));
  // Product pages (/p/) before accessories (/ap/)
  urls.sort((a, b) => (a.includes('/ap/') - b.includes('/ap/')));
  const pages = [];
  for (const url of urls.slice(0, 12)) {
    const page = await readPage(url);
    if (numbers.some((nr) => page.skus.has(nr))) return { ...page, match: 'number' };
    pages.push(page);
  }
  // Older/other build of the same device (different material number): accept a
  // product page (not accessories) that names exactly this type designation.
  const want = new RegExp(`(^|[^a-z0-9])${designation.toLowerCase().replace(/[^a-z0-9]+/g, '[^a-z0-9]*')}($|[^a-z0-9])`);
  const same = pages.find((p) => p.url.includes('/de/p/') && [p.name, ...p.variantNames].some((n) => want.test(String(n || '').toLowerCase())));
  return same ? { ...same, match: 'model' } : null;
}

module.exports = { brand: 'STIHL', findOfficial, materialNumber, slugToken, parsePage, clearCache };
