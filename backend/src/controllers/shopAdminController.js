const { Op } = require('sequelize');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { ShopProduct, ShopArticle, ShopBrand, ShopGroup } = require('../models');
const catalog = require('../services/shop/shopCatalog');
const { uvpFromExport } = require('../services/shop/prices');
const { singleArticleKey, deviceGroup, mainGroup, MAIN_ORDER } = require('../services/shop/productGrouping');

// PC tool "Produkte": everything about the product pages that the automatic
// import cannot decide - visibility, pictures, variants, brand keywords.

const num = (v) => (v == null ? null : Number(v));

// Technical data from the PC tool: up to 60 rows [label, value], empty rows dropped.
function cleanSpecs(list) {
  if (!Array.isArray(list)) throw new AppError('Technische Daten fehlen', 400, 'BAD_SPECS');
  return list
    .map((row) => (Array.isArray(row) ? row : [row?.label, row?.value]))
    .map(([k, v]) => [String(k ?? '').trim().slice(0, 120), String(v ?? '').trim().slice(0, 500)])
    .filter(([k, v]) => k && v)
    .slice(0, 60);
}

const listProducts = asyncHandler(async (req, res) => {
  // Hidden pages only appear under "Ausgeblendet", where they can be shown again
  const live = { variantCount: { [Op.gt]: 0 } };
  const shown = { ...live, visibility: { [Op.ne]: 'hide' } };
  const filter = req.query.filter || 'all';
  const where = filter === 'hidden' ? { ...live, visibility: 'hide' } : { ...shown };
  if (filter === 'unknown_brand') where.brand = null;
  if (filter === 'review') where.enrichStatus = 'review';
  const products = await ShopProduct.findAll({
    where,
    include: [{ model: ShopArticle, as: 'articles' }],
    order: [['title', 'ASC']],
  });
  const q = String(req.query.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const groups = new Map((await ShopGroup.findAll()).map((g) => [g.nr, g.name]));
  const rows = products
    .filter((p) => filter !== 'no_image' || !(p.images || []).length)
    .filter((p) => q.every((w) => (p.searchText || '').includes(w)))
    .map((p) => ({
      id: p.id, slug: p.slug, title: p.title, brand: p.brand, category: p.category,
      // Same categories as in the app: main category -> device
      device: deviceGroup(p.category), main: mainGroup(deviceGroup(p.category)),
      whg: p.whg, group: groups.get(p.whg) || null, visibility: p.visibility,
      price: num(p.price), uvp: num(p.uvp), isOffer: p.hasOffer, available: p.available,
      images: p.images || [], officialUrl: p.officialUrl, officialSpecs: p.officialSpecs || [],
      enrichStatus: p.enrichStatus, enrichedAt: p.enrichedAt,
      articles: p.articles.map((a) => ({
        id: a.id, artNr: a.artNr, stock: num(a.stock), reserved: num(a.reserved), free: catalog.freeStock(a),
        uvp: uvpFromExport({ listNet: a.listNet, listGross: a.listGrossRaw }), shopPrice: num(a.shopPrice),
        datePut: a.datePut, text1: a.text1 || a.kurztext, manual: !!a.manualGroupKey,
      })),
    }));
  const [total, noImage, hidden, unknownBrand, review] = await Promise.all([
    ShopProduct.count({ where: shown }),
    ShopProduct.findAll({ where: shown, attributes: ['images'] }).then((l) => l.filter((p) => !(p.images || []).length).length),
    ShopProduct.count({ where: { ...live, visibility: 'hide' } }),
    ShopProduct.count({ where: { ...shown, brand: null } }),
    ShopProduct.count({ where: { ...shown, enrichStatus: 'review' } }),
  ]);
  res.json({ success: true, data: { products: rows, counts: { total, noImage, hidden, unknownBrand, review }, mainOrder: MAIN_ORDER } });
});

const updateProduct = asyncHandler(async (req, res) => {
  const p = await ShopProduct.findByPk(req.params.id);
  if (!p) throw new NotFoundError('Produkt');
  if (req.body.visibility !== undefined) {
    if (!['auto', 'show', 'hide'].includes(req.body.visibility)) throw new AppError('Ungültige Sichtbarkeit', 400, 'BAD_VISIBILITY');
    await p.update({ visibility: req.body.visibility });
  }
  // Technical data edited by hand in the PC tool: [[label, value], ...]. Marks the
  // page "von Hand", so automatic fetching and the monthly check leave it alone.
  if (req.body.officialSpecs !== undefined) {
    await p.update({ officialSpecs: cleanSpecs(req.body.officialSpecs), enrichStatus: 'manual' });
  }
  catalog.invalidate();
  res.json({ success: true, data: { product: p } });
});

// Fetch pictures/data from the manufacturer page again (STIHL: exact match).
const enrichNow = asyncHandler(async (req, res) => {
  const p = await ShopProduct.findByPk(req.params.id);
  if (!p) throw new NotFoundError('Produkt');
  const { enrichProduct } = require('../services/shop/enrich');
  const result = await enrichProduct(p);
  catalog.invalidate();
  res.json({ success: true, data: { result, product: await p.reload() } });
});

// Add a picture from an official manufacturer page by its URL.
const addImage = asyncHandler(async (req, res) => {
  const p = await ShopProduct.findByPk(req.params.id);
  if (!p) throw new NotFoundError('Produkt');
  const url = String(req.body.url || '').trim();
  if (!/^https:\/\/[^/\s]+\.[a-z]{2,}\//i.test(url)) throw new AppError('Bitte einen https-Link zu einem Bild angeben', 400, 'BAD_URL');
  const { storeImages } = require('../services/shop/enrich/http');
  const folder = `${p.slug}/m${Date.now()}`;
  const [img] = await storeImages(folder, [url], new URL(url).hostname);
  if (!img) throw new AppError('Bild konnte nicht geladen werden', 400, 'IMAGE_FAILED');
  await p.update({ images: [...(p.images || []), img], enrichStatus: 'manual' });
  catalog.invalidate();
  res.json({ success: true, data: { product: p } });
});

// A picture from the PC (sent as data URL; the PC tool scales it down first).
const uploadImage = asyncHandler(async (req, res) => {
  const p = await ShopProduct.findByPk(req.params.id);
  if (!p) throw new NotFoundError('Produkt');
  const m = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(req.body.data || ''));
  if (!m) throw new AppError('Bitte ein Bild (JPG, PNG, WebP) auswählen', 400, 'BAD_IMAGE');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) throw new AppError('Das Bild ist zu groß (max. 8 MB)', 413, 'IMAGE_TOO_LARGE');
  const { storeImageBuffer } = require('../services/shop/enrich/http');
  let img;
  try {
    img = await storeImageBuffer(`${p.slug}/m${Date.now()}`, '1', buf);
  } catch (e) {
    throw new AppError('Bild konnte nicht gelesen werden', 400, 'IMAGE_FAILED');
  }
  const first = req.body.first === true;
  const entry = { ...img, source: 'eigenes Bild' };
  const images = first ? [entry, ...(p.images || [])] : [...(p.images || []), entry];
  await p.update({ images, enrichStatus: 'manual' });
  catalog.invalidate();
  res.json({ success: true, data: { product: p } });
});

// Make a picture the main picture (first in the list).
const makeMainImage = asyncHandler(async (req, res) => {
  const p = await ShopProduct.findByPk(req.params.id);
  if (!p) throw new NotFoundError('Produkt');
  const i = parseInt(req.params.index, 10);
  const images = [...(p.images || [])];
  if (!(i >= 0 && i < images.length)) throw new NotFoundError('Bild');
  const [img] = images.splice(i, 1);
  await p.update({ images: [img, ...images], enrichStatus: 'manual' });
  catalog.invalidate();
  res.json({ success: true, data: { product: p } });
});

const removeImage = asyncHandler(async (req, res) => {
  const p = await ShopProduct.findByPk(req.params.id);
  if (!p) throw new NotFoundError('Produkt');
  const i = parseInt(req.params.index, 10);
  const images = [...(p.images || [])];
  if (!(i >= 0 && i < images.length)) throw new NotFoundError('Bild');
  images.splice(i, 1);
  await p.update({ images, enrichStatus: 'manual' });
  catalog.invalidate();
  res.json({ success: true, data: { product: p } });
});

// Make an article its own page, or move it to another product's page.
const regroupArticle = asyncHandler(async (req, res) => {
  const a = await ShopArticle.findByPk(req.params.id);
  if (!a) throw new NotFoundError('Artikel');
  let key = null;
  if (req.body.action === 'split') key = singleArticleKey(a);
  else if (req.body.action === 'move') {
    const target = await ShopProduct.findOne({ where: { slug: String(req.body.slug || '') } });
    if (!target) throw new NotFoundError('Ziel-Produkt');
    key = target.groupKey;
  } else if (req.body.action === 'auto') key = null;
  else throw new AppError('Unbekannte Aktion', 400, 'BAD_ACTION');
  await a.update({ manualGroupKey: key });
  const r = await catalog.rebuildProducts();
  res.json({ success: true, data: r });
});

const listBrands = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { brands: await ShopBrand.findAll({ order: [['name', 'ASC']] }) } });
});

const saveBrand = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new AppError('Name fehlt', 400, 'NAME_REQUIRED');
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim()).filter(Boolean);
  const data = { name, keywords: list(req.body.keywords).map((k) => k.toLowerCase()), prefixes: list(req.body.prefixes).map((k) => k.toUpperCase()) };
  if (!data.keywords.length) data.keywords = [name.toLowerCase()];
  let brand = req.params.id ? await ShopBrand.findByPk(req.params.id) : null;
  if (brand) await brand.update(data);
  else brand = await ShopBrand.create(data);
  await catalog.rebuildProducts();
  res.json({ success: true, data: { brand } });
});

// Fill pictures/data for all products in the background (first run, or after
// adding an enricher). force = also products that were found before.
const enrichAll = asyncHandler(async (req, res) => {
  const { enrichMissing } = require('../services/shop/enrich');
  enrichMissing({ limit: 1000, force: !!req.body.force }).catch(() => {});
  res.json({ success: true, data: { started: true } });
});

// Same check the monthly job does: are pictures + data still the manufacturer's current ones?
const recheckNow = asyncHandler(async (req, res) => {
  const { recheckAll } = require('../services/shop/enrich');
  recheckAll({ slugs: Array.isArray(req.body.slugs) ? req.body.slugs : null }).catch(() => {});
  res.json({ success: true, data: { started: true } });
});

const runImport = asyncHandler(async (req, res) => {
  const { scanAndImport } = require('../services/shop/shopStockImport');
  const result = await scanAndImport();
  const rebuilt = result.scanned ? null : await catalog.rebuildProducts();
  res.json({ success: true, data: { result, rebuilt } });
});

module.exports = { listProducts, updateProduct, enrichNow, enrichAll, recheckNow, addImage, uploadImage, makeMainImage, removeImage, regroupArticle, listBrands, saveBrand, runImport, cleanSpecs };
