const { Op } = require('sequelize');
const { sequelize, ShopArticle, ShopProduct, ShopBrand, ShopGroup } = require('../../models');
const G = require('./productGrouping');
const { uvpFromExport, priceInfo } = require('./prices');
const { ensureShopSeed } = require('./shopSeed');
const { isKaercherFileName } = require('./taifunArticleParser');

// Product catalog built from the Taifun stock export: stores articles, groups
// them into product pages and serves the public data for app + website.

const n = (v) => (v == null ? null : Number(v));
const freeStock = (a) => (a.stock == null ? 0 : n(a.stock) - n(a.reserved || 0));

// ── Import ──────────────────────────────────────────────────────────────

async function upsertArticles(list, sourceFile) {
  let inserted = 0;
  let updated = 0;
  const now = new Date();
  for (const a of list) {
    const catalog = a.catalog || 'main';
    const or = [{ artNr: a.artNr }];
    if (a.guid) or.push({ guid: a.guid });
    const existing = await ShopArticle.findOne({ where: { catalog, [Op.or]: or } });
    const data = {
      catalog,
      artNr: a.artNr,
      whg: a.whg ?? existing?.whg ?? null, // older exports have no WHG
      text1: a.text1 ?? existing?.text1 ?? null,
      text2: a.text2 ?? existing?.text2 ?? null,
      kurztext: a.kurztext ?? existing?.kurztext ?? null,
      listNet: a.listNet,
      listGrossRaw: a.listGrossRaw,
      shopPrice: a.shopPrice,
      stock: a.stock,
      datePut: a.datePut,
      lastImportedAt: now,
      lastSourceFile: sourceFile,
    };
    if (a.guid) data.guid = a.guid;
    if (existing) { await existing.update(data); updated += 1; } else { await ShopArticle.create(data); inserted += 1; }
  }
  return { inserted, updated };
}

// A reservation file is the complete list of open reservations of ONE Taifun
// account: the other account's reservations must stay. The account is the one
// that knows most of the listed article numbers (or the file name says Kaercher).
async function catalogOfReservations(sums, fileName) {
  if (isKaercherFileName(fileName)) return 'kaercher';
  const hits = await ShopArticle.findAll({ attributes: ['catalog'], where: { artNr: [...sums.keys()] } });
  if (!hits.length) return null;
  const kaercher = hits.filter((h) => h.catalog === 'kaercher').length;
  return kaercher * 2 > hits.length ? 'kaercher' : 'main';
}

async function applyReservations(sums, fileName) {
  const catalog = await catalogOfReservations(sums, fileName);
  if (!catalog) return { reservedArticles: 0 }; // none of these articles are known yet
  await sequelize.transaction(async (transaction) => {
    await ShopArticle.update({ reserved: 0 }, { where: { catalog, reserved: { [Op.ne]: 0 } }, transaction });
    for (const [artNr, qty] of sums) {
      await ShopArticle.update({ reserved: qty }, { where: { catalog, artNr }, transaction });
    }
  });
  return { reservedArticles: sums.size };
}

// ── Grouping into product pages ─────────────────────────────────────────

async function uniqueSlug(base, ownId) {
  let slug = base;
  for (let i = 2; ; i += 1) {
    const hit = await ShopProduct.findOne({ where: { slug } });
    if (!hit || hit.id === ownId) return slug;
    slug = `${base}-${i}`;
  }
}

function describe(article, brands) {
  // Everything from the Kaercher file is Kaercher, even if the name does not say so
  const brand = G.detectBrand(article, brands)
    || (article.catalog === 'kaercher' ? brands.find((b) => b.name === 'Kärcher') : null);
  const model = G.extractModel(article);
  const category = G.extractCategory(article, brand);
  return { article, brand, model, category, key: G.groupKeyFor(article, brand, model) };
}

function mostCommon(values) {
  const c = new Map();
  values.filter((v) => v != null && v !== '').forEach((v) => c.set(v, (c.get(v) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// Recomputes every product page from the articles. Idempotent.
async function rebuildProducts() {
  await ensureShopSeed();
  const brands = (await ShopBrand.findAll()).map((b) => b.get({ plain: true }));
  const groups = new Map((await ShopGroup.findAll()).map((g) => [g.nr, g]));
  const articles = await ShopArticle.findAll();
  const byKey = new Map();
  for (const a of articles) {
    const d = describe(a, brands);
    if (!byKey.has(d.key)) byKey.set(d.key, []);
    byKey.get(d.key).push(d);
  }

  const touched = new Set();
  for (const [key, items] of byKey) {
    const arts = items.map((d) => d.article);
    const brand = mostCommon(items.map((d) => d.brand?.name));
    const model = G.baseModel(mostCommon(items.map((d) => d.model)));
    const fullCategory = mostCommon(items.map((d) => d.category));
    const category = G.baseCategory(fullCategory);
    const whg = mostCommon(arts.map((a) => a.whg));
    const group = groups.get(whg);
    const nameText = G.nameLines(arts[0]).map((l) => l.replace(/^modell\s*:?\s*/i, '')).join(' ');
    const title = model
      ? [fullCategory, brand, model].filter(Boolean).join(' ')
      : nameText;
    const allText = arts.map((a) => [a.text1, a.text2, a.kurztext].join(' ')).join(' ');

    const prices = arts.map((a) => ({ a, ...priceInfo({ uvp: uvpFromExport({ listNet: a.listNet, listGross: a.listGrossRaw }), shopPrice: a.shopPrice }) }));
    const priced = prices.filter((p) => p.price != null).sort((x, y) => x.price - y.price);
    const cheapest = priced[0];

    let product = await ShopProduct.findOne({ where: { groupKey: key } });
    // Grouping changed (new brand keyword, split/merge): keep the page the
    // articles were on - with its address, pictures and visibility.
    if (!product) {
      const previousIds = [...new Set(arts.map((a) => a.productId).filter(Boolean))];
      const previous = previousIds.length
        ? await ShopProduct.findAll({ where: { id: previousIds } })
        : [];
      const reusable = previous.find((p) => !touched.has(p.id) && !byKey.has(p.groupKey));
      if (reusable) {
        await reusable.update({ groupKey: key });
        product = reusable;
      }
    }
    const fields = {
      title, brand, model, category,
      categoryKey: G.categoryKey(fullCategory),
      whg,
      drive: G.detectDrive(allText, group?.drive),
      batterySystem: G.detectBatterySystem(allText),
      price: cheapest?.price ?? null,
      uvp: cheapest?.uvp ?? null,
      hasOffer: prices.some((p) => p.isOffer),
      available: arts.some((a) => freeStock(a) > 0),
      variantCount: arts.length,
      searchText: [title, brand, model, category, fullCategory, group?.name, ...arts.map((a) => a.artNr), allText].join(' ').toLowerCase(),
    };
    if (product) {
      await product.update(fields);
    } else {
      const slug = await uniqueSlug(G.slugify(model ? `${brand || ''} ${model}` : title));
      product = await ShopProduct.create({ groupKey: key, slug, ...fields });
    }
    touched.add(product.id);
    const ids = arts.filter((a) => a.productId !== product.id).map((a) => a.id);
    if (ids.length) await ShopArticle.update({ productId: product.id }, { where: { id: ids } });
  }
  // Pages whose articles all moved elsewhere
  const orphanWhere = { variantCount: { [Op.ne]: 0 } };
  if (touched.size) orphanWhere.id = { [Op.notIn]: [...touched] };
  await ShopProduct.update({ variantCount: 0 }, { where: orphanWhere });
  invalidate();
  return { products: touched.size, articles: articles.length };
}

// ── Public data ─────────────────────────────────────────────────────────

// Short-lived: pictures and data can also be written by another process.
const CACHE_MS = 2 * 60 * 1000;
let cache = null;
let cacheAt = 0;
function invalidate() { cache = null; }

const isVisible = (p) => p.variantCount > 0 && p.visibility !== 'hide';

function variantOut(a, label) {
  const uvp = uvpFromExport({ listNet: a.listNet, listGross: a.listGrossRaw });
  const { price, isOffer } = priceInfo({ uvp, shopPrice: a.shopPrice });
  const { specs, notes } = G.parseSpecs(a);
  return { artNr: a.artNr, label, price, uvp, isOffer, available: freeStock(a) > 0, specs, notes };
}

const discountOf = (v) => (v.isOffer && v.uvp ? Math.floor(((v.uvp - v.price) / v.uvp) * 100) : 0);

function productOut(p, articles, groupName, { detail = false } = {}) {
  const sorted = [...articles].sort((x, y) => String(x.artNr).localeCompare(String(y.artNr)));
  const labels = G.variantLabels(sorted);
  const variants = sorted.map((a) => variantOut(a, labels.get(a.artNr)));
  // Rounded down so the page never promises more than the real discount.
  const discounts = variants.map((v) => discountOf(v)).filter((d) => d > 0);
  const out = {
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    model: p.model,
    category: p.category,
    categoryKey: p.categoryKey,
    whg: p.whg,
    group: groupName,
    drive: p.drive,
    batterySystem: p.batterySystem,
    price: n(p.price),
    uvp: n(p.uvp),
    isOffer: !!p.hasOffer,
    discountPercent: discounts.length ? Math.max(...discounts) : 0,
    discountUpTo: new Set(discounts).size > 1 || (discounts.length > 0 && discounts.length < variants.length),
    available: !!p.available,
    variantCount: variants.length,
    image: p.images?.[0]?.thumb || p.images?.[0]?.url || null,
  };
  if (!detail) return out;
  return {
    ...out,
    images: p.images || [],
    variants,
    officialSpecs: p.officialSpecs || [],
    officialUrl: p.officialUrl || null,
    officialSource: p.officialUrl ? new URL(p.officialUrl).hostname.replace(/^www\./, '') : null,
  };
}

async function loadCatalog() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const [products, groups] = await Promise.all([
    ShopProduct.findAll({ include: [{ model: ShopArticle, as: 'articles' }] }),
    ShopGroup.findAll(),
  ]);
  const groupNames = new Map(groups.map((g) => [g.nr, g.name]));
  const visible = products.filter(isVisible);
  cache = {
    groups,
    list: visible.map((p) => ({ raw: p, out: productOut(p, p.articles, groupNames.get(p.whg)), search: p.searchText || '' })),
    bySlug: new Map(visible.map((p) => [p.slug, p])),
    groupNames,
  };
  cacheAt = Date.now();
  return cache;
}

const many = (v) => (v == null || v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));

// query: q, whg, category, brand, drive, system, available, offer, minPrice, maxPrice, sort, page, limit
async function listProducts(query = {}) {
  const c = await loadCatalog();
  const words = String(query.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const f = {
    whg: many(query.whg).map(Number), category: many(query.category), brand: many(query.brand),
    drive: many(query.drive), system: many(query.system),
  };
  const minP = query.minPrice != null && query.minPrice !== '' ? Number(query.minPrice) : null;
  const maxP = query.maxPrice != null && query.maxPrice !== '' ? Number(query.maxPrice) : null;

  // Each facet counts what the OTHER filters leave over, so options never dead-end.
  const pass = (e, skip) => {
    const o = e.out;
    if (words.length && !words.every((w) => e.search.includes(w))) return false;
    if (skip !== 'whg' && f.whg.length && !f.whg.includes(o.whg)) return false;
    if (skip !== 'category' && f.category.length && !f.category.includes(o.categoryKey)) return false;
    if (skip !== 'brand' && f.brand.length && !f.brand.includes(o.brand)) return false;
    if (skip !== 'drive' && f.drive.length && !f.drive.includes(o.drive)) return false;
    if (skip !== 'system' && f.system.length && !f.system.includes(o.batterySystem)) return false;
    if (query.available === '1' && !o.available) return false;
    if (query.offer === '1' && !o.isOffer) return false;
    if (minP != null && (o.price == null || o.price < minP)) return false;
    if (maxP != null && (o.price == null || o.price > maxP)) return false;
    return true;
  };
  const facet = (skip, keyOf, labelOf) => {
    const m = new Map();
    c.list.filter((e) => pass(e, skip)).forEach((e) => {
      const k = keyOf(e.out);
      if (k == null || k === '') return;
      const cur = m.get(k) || { value: k, label: labelOf(e.out), count: 0 };
      cur.count += 1;
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
  };

  let items = c.list.filter((e) => pass(e)).map((e) => e.out);
  const sort = query.sort || 'relevance';
  const byName = (a, b) => a.title.localeCompare(b.title, 'de');
  if (sort === 'price_asc') items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  else if (sort === 'price_desc') items.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  else if (sort === 'name') items.sort(byName);
  // Strongly reduced articles first, by percent
  else items.sort((a, b) => (b.discountPercent - a.discountPercent) || (b.available - a.available) || (!!b.image - !!a.image) || byName(a, b));

  const total = items.length;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 48, 1), 500);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  items = items.slice((page - 1) * limit, page * limit);

  const prices = c.list.filter((e) => pass(e, 'price')).map((e) => e.out.price).filter((p) => p != null);
  return {
    total, page, limit, items,
    facets: {
      whg: facet('whg', (o) => o.whg, (o) => o.group || `Warengruppe ${o.whg}`),
      category: facet('category', (o) => o.categoryKey, (o) => o.category),
      brand: facet('brand', (o) => o.brand, (o) => o.brand),
      drive: facet('drive', (o) => o.drive, (o) => ({ akku: 'Akku', benzin: 'Benzin', elektro: 'Elektro', diesel: 'Diesel' }[o.drive] || o.drive)),
      system: facet('system', (o) => o.batterySystem, (o) => `${o.batterySystem}-System`),
      available: c.list.filter((e) => pass(e) && e.out.available).length,
      offer: c.list.filter((e) => pass(e) && e.out.isOffer).length,
      price: prices.length ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) } : null,
    },
  };
}

async function getProduct(slug) {
  const c = await loadCatalog();
  const p = c.bySlug.get(slug);
  if (!p) return null;
  return productOut(p, p.articles, c.groupNames.get(p.whg), { detail: true });
}

module.exports = {
  upsertArticles, applyReservations, rebuildProducts, listProducts, getProduct, invalidate, productOut,
  freeStock,
};
