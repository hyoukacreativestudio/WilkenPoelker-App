// Everything the website shows comes from the app's public API: products
// (Taifun stock export), opening hours, closed days, team and news.
const { sleep } = require('./util');

function client(api) {
  const base = String(api).replace(/\/+$/, '');
  async function get(pathname, { optional = false } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      let res;
      try {
        res = await fetch(`${base}${pathname}`, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'wp-website-build' } });
      } catch (e) {
        if (attempt < 3) { await sleep(2000 * (attempt + 1)); continue; }
        throw new Error(`${pathname}: ${e.message}`);
      }
      // Rate limit of the API: wait and try again
      if (res.status === 429 && attempt < 6) { await sleep(30000); continue; }
      if (res.status >= 500 && attempt < 3) { await sleep(3000 * (attempt + 1)); continue; }
      if (!res.ok) {
        if (optional) return null;
        throw new Error(`${pathname}: HTTP ${res.status}`);
      }
      const body = await res.json();
      return body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
    }
  }
  return { base, get };
}

async function loadProducts(c, log) {
  const all = await c.get('/api/website/catalog', { optional: true });
  if (all && Array.isArray(all.products)) {
    log(`Produkte: ${all.products.length} (eine Abfrage)`);
    return { mainOrder: all.mainOrder || [], products: all.products };
  }
  // Older server without /api/website/catalog: one request per product
  const first = await c.get('/api/shop/products?limit=500&sort=name');
  let items = first.items;
  for (let page = 2; items.length < first.total; page += 1) {
    items = items.concat((await c.get(`/api/shop/products?limit=500&sort=name&page=${page}`)).items);
  }
  const products = [];
  for (const [i, item] of items.entries()) {
    await sleep(250); // stays below the API rate limit
    const d = await c.get(`/api/shop/products/${encodeURIComponent(item.slug)}`, { optional: true });
    if (d?.product) products.push(d.product);
    if ((i + 1) % 50 === 0) log(`  Produktdetails ${i + 1}/${items.length}`);
  }
  log(`Produkte: ${products.length} (einzeln abgefragt)`);
  return { mainOrder: (first.facets?.main || []).map((m) => m.value), products };
}

// Summer and winter hours. Servers before 2026-11-16 ignore ?season and answer
// with the current season only; the other one is then left out.
async function loadHours(c) {
  const out = {};
  for (const season of ['standard', 'winter']) {
    const d = await c.get(`/api/settings/opening-hours?season=${season}`, { optional: true });
    if (d && d.season === season && Array.isArray(d.schedule)) out[season] = d.schedule;
  }
  const current = await c.get('/api/settings/opening-hours/status', { optional: true });
  return { ...out, currentSeason: current?.season || null };
}

async function loadAll({ api, log = console.log }) {
  const c = client(api);
  const [catalog, hours, closed, team, news] = [
    await loadProducts(c, log),
    await loadHours(c),
    await c.get('/api/settings/closed-days', { optional: true }),
    await c.get('/api/about/team', { optional: true }),
    await c.get('/api/website/news?limit=6', { optional: true }),
  ];
  return {
    api: c.base,
    mainOrder: catalog.mainOrder,
    products: catalog.products,
    hours,
    closedDays: closed?.days || [],
    team: team?.departments || [],
    news: news?.posts || [],
  };
}

module.exports = { loadAll, client };
