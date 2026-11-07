const { Op } = require('sequelize');
const { ShopProduct, ShopArticle, User, Notification } = require('../../../models');
const logger = require('../../../utils/logger');
const { storeImages, syncImages, politeFetch, isGone } = require('./http');
const catalog = require('../shopCatalog');
const { parseSpecs } = require('../productGrouping');
const { lookOf } = require('../productFacets');

// Automatic manufacturer data (pictures + technical data) for product pages.
// Only manufacturers whose pages can be matched EXACTLY (by article number)
// get an enricher; other brands use the researched list (curated.js) by
// article number. Everything else stays in the PC tool's "ohne Bild" list.
const ENRICHERS = [require('./stihl')];
const curated = require('./curated');
const RETRY_DAYS = 7;

let running = false;

// Pictures that show only some variants (curated imageArtNrs) get the look of
// those variants, e.g. "Wave · Schwarz", so the pages can switch pictures.
function tagLooks(images, page, articles) {
  if (!page.imageArtNrs) return images;
  const lookByArtNr = new Map(articles.map((a) => [String(a.artNr).toUpperCase(), lookOf(parseSpecs(a).specs)]));
  return images.map((img) => {
    const i = page.images.indexOf(img.original);
    const nrs = i >= 0 ? page.imageArtNrs[i] : [];
    const look = (nrs || []).map((n) => lookByArtNr.get(n)).find(Boolean) || null;
    const { look: _old, ...rest } = img;
    return look ? { ...rest, look } : rest;
  });
}

async function findPage(product, articles) {
  const enricher = ENRICHERS.find((e) => e.brand === product.brand);
  const page = enricher ? await enricher.findOfficial(product, articles) : null;
  return page || curated.findOfficial(product, articles);
}

async function enrichProduct(product) {
  const articles = await ShopArticle.findAll({ where: { productId: product.id } });
  try {
    const page = await findPage(product, articles);
    if (!page) {
      await product.update({ enrichStatus: 'not_found', enrichedAt: new Date() });
      return 'not_found';
    }
    const images = tagLooks(await storeImages(product.slug, page.images, new URL(page.url).hostname), page, articles);
    await product.update({
      images: images.length ? images : product.images,
      officialSpecs: page.specs,
      officialUrl: page.url,
      officialName: page.name,
      // found_model = same type designation, other material number (older build)
      enrichStatus: page.match === 'model' ? 'found_model' : 'found',
      enrichedAt: new Date(),
    });
    return 'found';
  } catch (e) {
    await product.update({ enrichStatus: 'error', enrichedAt: new Date() });
    logger.warn('Shop enrich error', { product: product.slug, error: e.message });
    return 'error';
  }
}

// Products never tried, or not found / failed more than RETRY_DAYS ago.
// Pages an admin edited by hand (enrichStatus manual) are never overwritten.
async function enrichMissing({ limit = 50, force = false, slugs = null } = {}) {
  if (running) return { skipped: true };
  running = true;
  const counts = { found: 0, not_found: 0, error: 0 };
  try {
    const where = { variantCount: { [Op.gt]: 0 } };
    if (slugs) {
      where.slug = slugs;
    } else if (force) {
      where[Op.or] = [{ enrichStatus: null }, { enrichStatus: { [Op.ne]: 'manual' } }];
    } else {
      const before = new Date(Date.now() - RETRY_DAYS * 24 * 3600 * 1000);
      where[Op.or] = [
        { enrichStatus: null },
        { enrichStatus: ['not_found', 'error'], enrichedAt: { [Op.lt]: before } },
      ];
    }
    const products = await ShopProduct.findAll({ where, limit });
    for (const p of products) counts[await enrichProduct(p)] += 1;
    if (products.length) catalog.invalidate();
    logger.info('Shop enrich run', counts);
    return counts;
  } finally {
    running = false;
  }
}

// ── Monthly check ───────────────────────────────────────────────────────
// We only hold a licence for the manufacturer's current pictures, so once a month
// every product with manufacturer data is compared with the manufacturer again:
//   updated   pictures or data changed and were replaced
//   unchanged nothing to do
//   review    the manufacturer no longer has this product or any of its pictures;
//             the pictures are removed and the PC tool lists the product under "Prüfen"
//   unknown   the page could not be reached (bot check, server error, no connection);
//             nothing is changed, the next run tries again
async function recheckProduct(product) {
  const articles = await ShopArticle.findAll({ where: { productId: product.id } });
  let page;
  try {
    page = await findPage(product, articles);
    // The researched list holds fixed links: is the manufacturer's page still there?
    if (page && !ENRICHERS.some((e) => e.brand === product.brand)) await politeFetch(page.url);
  } catch (e) {
    if (!isGone(e)) return 'unknown';
    page = null;
  }

  if (!page) return 'gone'; // removed by recheckAll, see removeGone

  const specsChanged = JSON.stringify(page.specs || []) !== JSON.stringify(product.officialSpecs || []);
  const synced = await syncImages(product.slug, page.images || [], new URL(page.url).hostname, product.images || []);
  if (synced.unknown) {
    if (specsChanged) await product.update({ officialSpecs: page.specs, officialUrl: page.url, officialName: page.name });
    return specsChanged ? 'updated' : 'unknown';
  }
  const noImagesLeft = !synced.images.length && (product.images || []).length > 0;
  await product.update({
    images: tagLooks(synced.images, page, articles),
    officialSpecs: page.specs,
    officialUrl: page.url,
    officialName: page.name,
    enrichStatus: noImagesLeft ? 'review' : (page.match === 'model' ? 'found_model' : 'found'),
    enrichedAt: new Date(),
  });
  if (noImagesLeft) return 'review';
  return synced.changed || specsChanged ? 'updated' : 'unchanged';
}

// If a manufacturer changes its website, a whole brand can suddenly look "gone".
// Pictures are only removed when that is plausible; otherwise staff gets a warning.
const tooManyGone = (gone, checked) => gone > Math.max(5, checked * 0.15);

async function removeGone(product) {
  await syncImages(product.slug, [], '', product.images || []);
  await product.update({ images: [], enrichStatus: 'review', enrichedAt: new Date() });
}

async function recheckAll({ slugs = null } = {}) {
  if (running) return { skipped: true };
  running = true;
  const counts = { updated: 0, unchanged: 0, review: 0, unknown: 0 };
  try {
    ENRICHERS.forEach((e) => e.clearCache?.());
    const where = { variantCount: { [Op.gt]: 0 }, enrichStatus: ['found', 'found_model', 'review'] };
    if (slugs) where.slug = slugs;
    const products = await ShopProduct.findAll({ where });
    const gone = [];
    for (const p of products) {
      try {
        const result = await recheckProduct(p);
        if (result === 'gone') gone.push(p); else counts[result] += 1;
      } catch (e) {
        counts.unknown += 1;
        logger.warn('Shop recheck error', { product: p.slug, error: e.message });
      }
    }
    const suspicious = tooManyGone(gone.length, products.length);
    if (suspicious) {
      counts.unknown += gone.length;
      logger.warn('Shop monthly recheck: too many products without manufacturer page, nothing removed', { gone: gone.length });
    } else {
      for (const p of gone) await removeGone(p);
      counts.review += gone.length;
    }
    if (products.length) catalog.invalidate();
    logger.info('Shop monthly recheck', counts);
    if (counts.updated || counts.review || suspicious) await notifyStaff(counts, suspicious ? gone.length : 0);
    return counts;
  } finally {
    running = false;
  }
}

async function notifyStaff(counts, suspiciousGone) {
  const staff = await User.findAll({
    where: { role: { [Op.in]: ['admin', 'super_admin', 'sales_manager'] }, isActive: true },
    attributes: ['id'],
  });
  const warning = suspiciousGone
    ? ` Achtung: ${suspiciousGone} Produkte waren beim Hersteller nicht zu finden. Das sieht nach einer Störung aus, deshalb wurde nichts entfernt.`
    : '';
  await Notification.bulkCreate(staff.map((u) => ({
    userId: u.id,
    title: 'Produktbilder und Daten geprüft',
    message: `${counts.updated} aktualisiert, ${counts.review} zu prüfen (PC-Programm: Produkte), ${counts.unknown} nicht erreichbar.${warning}`,
    type: 'system',
    category: 'system',
    relatedType: 'shop_recheck',
  })));
}

module.exports = { enrichMissing, enrichProduct, recheckAll, recheckProduct, ENRICHERS };
