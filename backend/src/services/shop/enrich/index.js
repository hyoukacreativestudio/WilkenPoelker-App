const { Op } = require('sequelize');
const { ShopProduct, ShopArticle } = require('../../../models');
const logger = require('../../../utils/logger');
const { storeImages } = require('./http');
const catalog = require('../shopCatalog');

// Automatic manufacturer data (pictures + technical data) for product pages.
// Only manufacturers whose pages can be matched EXACTLY (by article number)
// get an enricher; other brands use the researched list (curated.js) by
// article number. Everything else stays in the PC tool's "ohne Bild" list.
const ENRICHERS = [require('./stihl')];
const curated = require('./curated');
const RETRY_DAYS = 7;

let running = false;

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
    const images = await storeImages(product.slug, page.images, new URL(page.url).hostname);
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

module.exports = { enrichMissing, enrichProduct, ENRICHERS };
