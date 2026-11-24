// Product pages from the Taifun catalog (same data as the app's Produkte tab)
const { esc, euro, clip, json, plural, fitTitle } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY, txt } = require('../content');
const { L, isEn, mainName, deviceName, driveName, systemName, specLabel, specValue, variantLabel, noteText, looksGerman, labelIsGerman } = require('../i18n');
const seo = require('../seo');

const cardsOf = (ctx, list, n = 0) => list.map((p, i) => C.productCard(p, ctx.productImages.get(p.slug)?.[0], { eager: i < n })).join('');
const products = (n) => plural(n, L('Produkt', 'product'), L('Produkte', 'products'));
const HOME = () => [L('Start', 'Home'), '/'];
const PRODUCTS = () => [L('Produkte', 'Products'), '/produkte/'];

// Recommended order: offers with the highest discount, then available, then name
const recommended = (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)
  || (b.available ? 1 : 0) - (a.available ? 1 : 0) || a.title.localeCompare(b.title, 'de');

// Filter panel + grid (catalog.js). fixed: facets that are not offered
function shop(ctx, list, { fixed = [], label = L('Produkte', 'Products') } = {}) {
  const facet = (key, title) => (fixed.includes(key) ? '' : `<div data-facet="${key}"><h3>${title}</h3><div class="fchips"></div></div>`);
  return `<div class="shop" data-shop data-label="${esc(label)}">
<aside class="filters" id="filters" aria-label="Filter">
<div class="fsheet-head"><h2>${L('Filter', 'Filters')}</h2><button class="icon-btn" type="button" data-f-close aria-label="${L('Filter schließen', 'Close filters')}">${icon('close')}</button></div>
<h3>${L('Suche', 'Search')}</h3><input type="search" data-f-q placeholder="${L('Name, Hersteller, Modell', 'Name, manufacturer, model')}" aria-label="${L('In dieser Liste suchen', 'Search this list')}">
<h3>${L('Anzeigen', 'Show')}</h3><div class="fchips"><button type="button" class="fchip" data-flag="avail" aria-pressed="false">${L('Nur verfügbare', 'Available only')}</button><button type="button" class="fchip" data-flag="offer" aria-pressed="false">${L('Nur Angebote', 'Offers only')}</button></div>
${facet('main', L('Kategorie', 'Category'))}${facet('cat', L('Gerät', 'Product type'))}${facet('drive', L('Antrieb', 'Power source'))}${facet('sys', L('Akku-System', 'Battery system'))}${facet('brand', L('Hersteller', 'Manufacturer'))}
<h3>${L('Preis in Euro', 'Price in euros')}</h3><div class="prices"><input type="number" data-f-min placeholder="${L('von', 'from')}" min="0" inputmode="numeric" aria-label="${L('Preis von', 'Price from')}"><span>${L('bis', 'to')}</span><input type="number" data-f-max placeholder="${L('bis', 'to')}" min="0" inputmode="numeric" aria-label="${L('Preis bis', 'Price to')}"></div>
<p class="f-reset-row"><button type="button" class="btn btn-ghost btn-sm" data-f-reset>${L('Filter zurücksetzen', 'Reset filters')}</button></p>
<div class="fsheet-foot"><button type="button" class="btn btn-ghost" data-f-reset>${L('Zurücksetzen', 'Reset')}</button><button type="button" class="btn" data-f-close data-f-show>${L(`${products(list.length)} anzeigen`, `Show ${products(list.length)}`)}</button></div>
</aside>
<div>
<div class="shopbar"><b data-count aria-live="polite">${products(list.length)}</b><span class="btns"><button type="button" class="btn btn-quiet btn-sm" id="ftoggle" aria-controls="filters" aria-expanded="false">${icon('filter')}${L('Filter', 'Filters')}</button><select class="sortsel" data-sort aria-label="${L('Sortierung', 'Sort order')}"><option value="relevance">${L('Empfohlen', 'Recommended')}</option><option value="price_asc">${L('Preis aufsteigend', 'Price, low to high')}</option><option value="price_desc">${L('Preis absteigend', 'Price, high to low')}</option><option value="name">${L('Name A bis Z', 'Name A to Z')}</option></select></span></div>
<div class="pgrid" data-grid>${cardsOf(ctx, list, 4)}</div>
<div class="empty" data-empty hidden><p><b>${L('Keine passenden Produkte.', 'No matching products.')}</b></p><p>${L('Ändern Sie die Filter oder fragen Sie uns direkt: Vieles bestellen wir für Sie.', 'Change the filters or ask us directly: we can order a lot for you.')} ${L('Telefon', 'Phone')} <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>.</p></div>
</div>
</div>`;
}

// ── /produkte/ ───────────────────────────────────────
function overview(ctx) {
  const tiles = ctx.categories.map((c) => {
    const img = c.image;
    const devs = c.devices.slice(0, 4).map((d) => deviceName(d.name)).join(', ');
    return `<a class="tile" href="${c.url}"><span class="pimg">${img ? `<img src="${img.small}" alt="" width="${img.sw}" height="${img.sh}" loading="lazy">` : ''}</span><span class="tile-text"><b>${esc(mainName(c.name))}</b><small>${products(c.count)}</small>${devs ? `<span class="tile-devs">${esc(devs)}</span>` : ''}</span></a>`;
  }).join('');
  const offers = ctx.products.filter((p) => p.isOffer && p.available).sort(recommended).slice(0, 12);
  const brands = ctx.brands.slice(0, 16);
  // Old links of the previous (German) website: /produkte/#kategorie=…
  const legacy = isEn() ? null : Object.fromEntries(ctx.categories.map((c) => [c.name, c.url]));
  const trail = [HOME(), PRODUCTS()];
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${L('Unsere Produkte', 'Our products')}</h1>
<p class="lead">${L(`${products(ctx.products.length)} mit aktuellem Preis und Verfügbarkeit, direkt aus unserer Warenwirtschaft. Wir verschicken nichts: Beratung, Kauf und Übergabe finden persönlich bei uns in Ostrhauderfehn statt, auf Wunsch liefern wir in der Region.`,
    `${products(ctx.products.length)} with current price and availability, straight from our merchandise management system. We do not ship: advice, purchase and handover take place in person at our shop in Ostrhauderfehn, and on request we deliver within the region.`)}</p>
<div class="btns" style="margin-top:22px"><button class="btn" type="button" data-open="search-sheet">${icon('search')}${L('Produkt suchen', 'Search products')}</button><a class="btn btn-quiet" href="/produkte/alle.html">${icon('filter')}${L('Alle Produkte mit Filter', 'All products with filters')}</a><a class="btn btn-quiet" href="/angebote.html">${icon('tag')}${L('Angebote', 'Offers')}</a></div>
</div>
</section>
<section class="sec-tight">
<div class="wrap">
<h2 class="sr">${L('Kategorien', 'Categories')}</h2>
<div class="tiles">${tiles}</div>
</div>
</section>
${offers.length ? `<section class="sec band"><div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Aktuelle Angebote', 'Current offers')}</h2><p>${L('Geräte aus unserem Laden mit einem Preis unter der unverbindlichen Preisempfehlung (UVP) des Herstellers.', 'Equipment in our shop priced below the manufacturer’s recommended retail price (RRP).')}</p></div><a class="link-more" href="/angebote.html">${L('Alle Angebote', 'All offers')}${icon('arrow-right')}</a></div>
<div class="rail">${cardsOf(ctx, offers)}</div>
</div></section>` : ''}
<section class="sec">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Marken, die halten', 'Brands that last')}</h2><p>${L('Wir führen Hersteller, deren Ersatzteile es auch in vielen Jahren noch gibt.', 'We sell manufacturers whose spare parts will still be available for many years.')}</p></div><a class="link-more" href="/marken/">${L('Alle Marken', 'All brands')}${icon('arrow-right')}</a></div>
<div class="brandwall" style="margin-top:0">${brands.map((b) => `<a href="${b.url}">${esc(b.name)} <small>${b.count}</small></a>`).join('')}</div>
<div class="faces-wrap" style="margin-top:clamp(32px,5vw,56px)"><div><h3>${L('Nicht gefunden, was Sie suchen?', 'Not found what you are looking for?')}</h3><p>${L('Hier sehen Sie, was wir im Laden haben. Vieles mehr bestellen wir für Sie, und unser Fahrradsortiment finden Sie im Fahrradkatalog.', 'This is what we have in our shop. We can order much more for you, and our full bicycle range is in the bicycle catalogue.')}</p></div><div class="btns"><a class="btn" href="/kontakt.html">${icon('mail')}${L('Anfrage stellen', 'Send an inquiry')}</a><a class="btn btn-quiet" href="/fahrraeder.html">${icon('bike')}${L('Fahrradkatalog', 'Bicycle catalogue')}</a></div></div>
</div>
</section>
${legacy ? `<script type="application/json" id="legacy-categories">${json(legacy)}</script>` : ''}`;
  return page(ctx, {
    path: '/produkte/',
    nav: 'produkte',
    title: L('Produkte mit Preis und Verfügbarkeit | Wilken Poelker', 'Products with price and availability | Wilken Poelker'),
    description: L(`${ctx.products.length} Produkte von STIHL, Kärcher, Honda und mehr: Motorsägen, Rasenmäher, Hochdruckreiniger und E-Bikes mit Preis und Verfügbarkeit, in Ostrhauderfehn.`,
      `${ctx.products.length} products from STIHL, Kärcher, Honda and more: chainsaws, lawn mowers, pressure washers and e-bikes with price and availability, in Ostrhauderfehn, Germany.`),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── /produkte/alle.html ──────────────────────────────
function all(ctx) {
  const list = [...ctx.products].sort(recommended);
  const trail = [HOME(), PRODUCTS(), [L('Alle Produkte', 'All products'), '/produkte/alle.html']];
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${L('Alle Produkte', 'All products')}</h1>
<p class="lead">${L('Das ganze Sortiment aus unserem Laden, mit Filtern nach Kategorie, Gerät, Antrieb, Hersteller und Preis.', 'The whole range of our shop, with filters for category, product type, power source, manufacturer and price.')}</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list)}</div></section>`;
  return page(ctx, {
    path: '/produkte/alle.html',
    nav: 'produkte',
    title: L('Alle Produkte | Wilken Poelker Ostrhauderfehn', 'All products | Wilken Poelker Ostrhauderfehn'),
    description: L(`Alle ${ctx.products.length} Produkte von Wilken Poelker mit Preis und Verfügbarkeit: filtern nach Kategorie, Gerät, Antrieb, Hersteller und Preis.`,
      `All ${ctx.products.length} products of Wilken Poelker with price and availability: filter by category, product type, power source, manufacturer and price.`),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── /produkte/<kategorie>/ ───────────────────────────
async function category(ctx, c) {
  const name = mainName(c.name);
  const info = txt().MAIN[c.name] || { title: name, intro: '' };
  const list = ctx.products.filter((p) => p.main === c.name).sort(recommended);
  const photo = info.photo ? await ctx.images.photo(info.photo) : null;
  const trail = [HOME(), PRODUCTS(), [name, c.url]];
  const devs = c.devices.length > 1 ? `<div class="chips" style="margin-top:22px">${c.devices.map((d) => `<a class="chip" href="${d.url}">${esc(deviceName(d.name))} <small>${d.count}</small></a>`).join('')}</div>` : '';
  const bikes = c.name === 'Fahrräder' ? `<p style="margin-top:18px"><a class="btn btn-quiet" href="/fahrraeder.html">${icon('bike')}${L('Zum Fahrradkatalog mit allen Rädern', 'Bicycle catalogue with all bikes')}</a></p>` : '';
  const body = `
<section class="phead">
<div class="wrap${photo ? ' phead-photo' : ''}">
<div>
${C.crumbs(trail)}
<h1>${esc(info.title)}</h1>
<p class="lead">${esc(info.intro)}</p>
${devs}${bikes}
</div>
${photo ? `<div class="ph">${C.photoImg(photo, { alt: L(`${c.name} in unserer Ausstellung`, `${name} in our showroom`), sizes: '(max-width: 860px) 100vw, 40vw', eager: true })}</div>` : ''}
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list, { fixed: ['main'], label: name })}</div></section>`;
  return page(ctx, {
    path: c.url,
    nav: 'produkte',
    title: isEn()
      ? fitTitle(`${info.title} in Ostrhauderfehn | Wilken Poelker`, `${info.title} | Wilken Poelker`, info.title)
      : fitTitle(`${info.title} kaufen in Ostrhauderfehn | Wilken Poelker`, `${info.title} in Ostrhauderfehn | Wilken Poelker`, `${info.title} in Ostrhauderfehn`, `${info.title} | Wilken Poelker`),
    description: clip(L(`${info.title} bei Wilken Poelker in Ostrhauderfehn: ${list.length} Produkte mit Preis und Verfügbarkeit. ${info.intro}`,
      `${info.title} at Wilken Poelker in Ostrhauderfehn: ${products(list.length)} with price and availability. ${info.intro}`), 158),
    ogImage: photo ? photo.large : undefined,
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.itemList(ctx, name, list)],
    body,
  });
}

// ── /produkte/<kategorie>/<geraet>.html ──────────────
function device(ctx, c, d) {
  const list = ctx.products.filter((p) => p.main === c.name && p.device === d.name).sort(recommended);
  const name = deviceName(d.name);
  const trail = [HOME(), PRODUCTS(), [mainName(c.name), c.url], [name, d.url]];
  const brands = [...new Set(list.map((p) => p.brand).filter(Boolean))];
  const sentence = txt().DEVICE[d.name] || L(`${d.name} bei Wilken Poelker.`, `${name} at Wilken Poelker.`);
  const others = c.devices.filter((x) => x.name !== d.name);
  const models = isEn()
    ? `${list.length > 1 ? `${list.length} models` : 'One model'}${brands.length ? ` from ${esc(brands.slice(0, 5).join(', '))}${brands.length > 5 ? ' and other manufacturers' : ''}` : ''}, with advice, a ready-to-use handover and service from our own workshop.`
    : `${list.length > 1 ? `${list.length} Modelle` : 'Ein Modell'}${brands.length ? ` von ${esc(brands.slice(0, 5).join(', '))}${brands.length > 5 ? ' und weiteren Herstellern' : ''}` : ''}, mit Beratung, einsatzbereiter Übergabe und Service aus unserer eigenen Werkstatt.`;
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${esc(name)}</h1>
<p class="lead">${esc(sentence)} ${models}</p>
${others.length ? `<div class="chips" style="margin-top:22px">${others.map((x) => `<a class="chip" href="${x.url}">${esc(deviceName(x.name))} <small>${x.count}</small></a>`).join('')}</div>` : ''}
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list, { fixed: ['main', 'cat'], label: name })}</div></section>`;
  return page(ctx, {
    path: d.url,
    nav: 'produkte',
    title: isEn()
      ? fitTitle(`${name} in Ostrhauderfehn | Wilken Poelker`, `${name} | Wilken Poelker`, name)
      : fitTitle(`${d.name} kaufen in Ostrhauderfehn | Wilken Poelker`, `${d.name} in Ostrhauderfehn | Wilken Poelker`, `${d.name} in Ostrhauderfehn`, `${d.name} | Wilken Poelker`),
    description: clip(isEn()
      ? `${name} at Wilken Poelker in Ostrhauderfehn: ${sentence} ${list.length} models with price and availability${brands.length ? `, including ${brands.slice(0, 3).join(', ')}` : ''}.`
      : `${d.name} bei Wilken Poelker in Ostrhauderfehn: ${sentence} ${list.length} Modelle mit Preis und Verfügbarkeit${brands.length ? `, unter anderem von ${brands.slice(0, 3).join(', ')}` : ''}.`, 158),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.itemList(ctx, name, list)],
    body,
  });
}

// ── /angebote.html ───────────────────────────────────
function offersPage(ctx) {
  const list = ctx.products.filter((p) => p.isOffer).sort(recommended);
  const trail = [HOME(), [L('Angebote', 'Offers'), '/angebote.html']];
  const lead = list.length
    ? L(`${products(list.length)} aus unserem Sortiment mit einem Preis unter der unverbindlichen Preisempfehlung (UVP) des Herstellers. Preise und Verfügbarkeit kommen direkt aus unserer Warenwirtschaft.`,
      `${products(list.length)} from our range priced below the manufacturer’s recommended retail price (RRP). Prices and availability come straight from our merchandise management system.`)
    : L('Gerade haben wir keine Angebote.', 'We have no offers at the moment.');
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${L('Aktuelle Angebote', 'Current offers')}</h1>
<p class="lead">${lead} ${L('Weitere Aktionen und Neuheiten finden Sie in unserer App.', 'You will find more promotions and new products in our app.')}</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">${list.length ? shop(ctx, list, { label: L('Angebote', 'Offers') }) : `<div class="empty"><p>${L('Schauen Sie bald wieder vorbei, oder fragen Sie uns nach aktuellen Aktionen:', 'Please check back soon, or ask us about current promotions:')} <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>.</p></div>`}</div></section>`;
  return page(ctx, {
    path: '/angebote.html',
    nav: 'angebote',
    title: L('Angebote | Wilken Poelker Ostrhauderfehn', 'Offers | Wilken Poelker Ostrhauderfehn'),
    description: L(`Angebote bei Wilken Poelker in Ostrhauderfehn: ${list.length} Produkte von STIHL, Kärcher und weiteren Marken unter der UVP des Herstellers, mit Beratung und Service aus eigener Werkstatt.`,
      `Offers at Wilken Poelker in Ostrhauderfehn: ${list.length} products from STIHL, Kärcher and other brands below the manufacturer’s RRP, with advice and service from our own workshop.`),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── /marken/ ─────────────────────────────────────────
function brandsIndex(ctx) {
  const trail = [HOME(), [L('Marken', 'Brands'), '/marken/']];
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${L('Unsere Marken', 'Our brands')}</h1>
<p class="lead">${L('Wir setzen bewusst auf renommierte Hersteller, deren Ersatzteile auch Jahre nach dem Kauf noch verfügbar sind. Das schützt Ihre Investition und macht Reparaturen möglich.', 'We deliberately choose renowned manufacturers whose spare parts are still available years after the purchase. That protects your investment and makes repairs possible.')}</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">
<div class="brandwall">${ctx.brands.map((b) => `<a href="${b.url}">${esc(b.name)} <small>${products(b.count)}</small></a>`).join('')}</div>
</div></section>`;
  return page(ctx, {
    path: '/marken/',
    nav: 'produkte',
    title: L('Marken: STIHL, Kärcher, Honda, Stiga und mehr | Wilken Poelker', 'Brands: STIHL, Kärcher, Honda, Stiga and more | Wilken Poelker'),
    description: clip(L(`Unsere Marken: ${ctx.brands.slice(0, 6).map((b) => b.name).join(', ')} und weitere. Mit Beratung, Übergabe und Service aus der eigenen Werkstatt in Ostrhauderfehn.`,
      `Our brands: ${ctx.brands.slice(0, 6).map((b) => b.name).join(', ')} and more. With advice, handover and service from our own workshop in Ostrhauderfehn.`), 158),
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

function brandPage(ctx, b) {
  const list = ctx.products.filter((p) => p.brand === b.name).sort(recommended);
  const trail = [HOME(), [L('Marken', 'Brands'), '/marken/'], [b.name, b.url]];
  const devices = [...new Set(list.map((p) => p.device).filter(Boolean))];
  const intro = txt().BRAND[b.name] || L(`Produkte von ${b.name} bei Wilken Poelker in Ostrhauderfehn, mit Beratung, einsatzbereiter Übergabe und Service aus unserer eigenen Werkstatt.`,
    `Products from ${b.name} at Wilken Poelker in Ostrhauderfehn, with advice, a ready-to-use handover and service from our own workshop.`);
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${esc(b.name)} ${L('bei Wilken Poelker', 'at Wilken Poelker')}</h1>
<p class="lead">${esc(intro)}</p>
${devices.length > 1 ? `<p class="phead-note">${L('Im Sortiment', 'In our range')}: ${devices.slice(0, 10).map((name) => {
    const c = ctx.categories.find((k) => k.devices.some((d) => d.name === name));
    const d = c && c.devices.find((x) => x.name === name);
    if (!d) return esc(deviceName(name));
    return `<a href="${c.devices.length > 1 ? d.url : c.url}">${esc(deviceName(name))}</a>`;
  }).join(', ')}</p>` : ''}
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list, { fixed: ['brand'], label: b.name })}</div></section>`;
  const devList = devices.slice(0, 3).map(deviceName).join(', ');
  return page(ctx, {
    path: b.url,
    nav: 'produkte',
    title: isEn()
      ? fitTitle(`${b.name} in Ostrhauderfehn | Wilken Poelker`, `${b.name} | Wilken Poelker`)
      : fitTitle(`${b.name} kaufen in Ostrhauderfehn | Wilken Poelker`, `${b.name} in Ostrhauderfehn | Wilken Poelker`, `${b.name} | Wilken Poelker`),
    description: clip(L(`${b.name} bei Wilken Poelker in Ostrhauderfehn: ${list.length} Produkte${devices.length ? ` wie ${devList}` : ''} mit Preis und Verfügbarkeit. ${intro}`,
      `${b.name} at Wilken Poelker in Ostrhauderfehn: ${products(list.length)}${devices.length ? ` such as ${devList}` : ''} with price and availability. ${intro}`), 158),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.itemList(ctx, b.name, list)],
    body,
  });
}

// ── /produkte/p/<slug>.html ──────────────────────────
// German pages: decimal point of the manufacturer data as a comma. English
// pages: known values in English, German number formats as English ones.
const germanNumber = (v) => String(v).replace(/^(\d+)\.(\d+)(?=\s|$)/, '$1,$2');
const valueText = (v) => (isEn() ? specValue(v) : germanNumber(v));

// Same label twice in a row (Leistung: kW and PS) -> one row. The labels stay
// German here (used as keys), shownSpecs() gives the label of the page language.
function mergeSpecs(rows) {
  const out = [];
  for (const [k, v] of rows || []) {
    const last = out[out.length - 1];
    if (last && last[0] === k) last[1] = `${last[1]} / ${valueText(v)}`;
    else out.push([k, valueText(v)]);
  }
  return out;
}
// English pages: [label, value, mark]; mark 1 = label still German, 2 = value
// still German (both get lang="de" in the page)
const germanMark = (k, label, v) => (isEn() ? (labelIsGerman(k) ? 1 : 0) | (looksGerman(v) ? 2 : 0) : 0);
const shownSpecs = (rows) => mergeSpecs(rows).map(([k, v]) => {
  const label = specLabel(k);
  const mark = germanMark(String(k).trim(), label, v);
  return mark ? [label, v, mark] : [label, v];
});
const deAttr = (on) => (on ? ' lang="de"' : '');

function describe(p) {
  const v0 = (p.variants || [])[0] || {};
  // In the English text only data that is in English
  const facts = shownSpecs(p.officialSpecs?.length ? p.officialSpecs : v0.specs).filter((r) => !r[2]).slice(0, 3);
  const sentence = txt().DEVICE[p.device];
  const parts = [];
  if (isEn()) {
    parts.push(`The ${p.title} is available from Wilken Poelker in Ostrhauderfehn${p.available ? ', currently in stock in our shop' : ''}.`);
    if (sentence) parts.push(sentence);
    if ((p.variants || []).length > 1) parts.push(`Available in ${p.variants.length} versions.`);
    if (facts.length) parts.push(`Key data: ${facts.map(([k, v]) => `${k} ${v}`).join(', ')}.`);
    if (!p.available) parts.push('It is currently out of stock, and we will be happy to order it for you.');
    if (p.main === 'Fahrräder') parts.push('Test ride on our test track, handover ready to ride and service in our own bicycle workshop.');
    else if (p.brand === 'Kärcher') parts.push('As an authorised Kärcher dealer we advise you in person and take care of maintenance and repairs in our Kärcher workshop.');
    else parts.push('We advise you in person, hand the equipment over ready to use with an introduction and take care of maintenance and repairs in our own workshop.');
    return parts.join(' ');
  }
  parts.push(`${p.title} gibt es bei Wilken Poelker in Ostrhauderfehn${p.available ? ', derzeit vorrätig in unserem Geschäft' : ''}.`);
  if (sentence) parts.push(sentence);
  if ((p.variants || []).length > 1) parts.push(`Erhältlich in ${p.variants.length} Ausführungen.`);
  if (facts.length) parts.push(`Wichtige Daten: ${facts.map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  if (!p.available) parts.push('Derzeit ist es nicht vorrätig, wir bestellen es gern für Sie.');
  if (p.main === 'Fahrräder') parts.push('Probefahrt auf unserer Teststrecke, Übergabe fahrbereit und Service in unserer eigenen Zweiradwerkstatt.');
  else if (p.brand === 'Kärcher') parts.push('Als autorisierter Kärcher-Händler beraten wir Sie persönlich und kümmern uns in unserer Kärcher-Werkstatt um Wartung und Reparatur.');
  else parts.push('Wir beraten Sie persönlich, übergeben das Gerät einsatzbereit mit Einweisung und kümmern uns in unserer eigenen Werkstatt um Wartung und Reparatur.');
  return parts.join(' ');
}

// The saving always says what it refers to: the manufacturer's UVP
function variantPrice(v) {
  if (v.price == null) return `<span class="price">${L('Preis auf Anfrage', 'Price on request')}</span>`;
  const save = v.isOffer && v.uvp && v.uvp > v.price ? Math.floor(((v.uvp - v.price) / v.uvp) * 100) : 0;
  return `<span class="price${v.isOffer ? ' offer' : ''}">${euro(v.price)}</span>${save ? ` <span class="uvp">${L('UVP', 'RRP')} ${euro(v.uvp)}</span><span class="save"><span>${L(`${save}&nbsp;% unter UVP`, `${save}% below RRP`)}</span></span>` : ''}`;
}

function related(ctx, p) {
  const same = ctx.products.filter((x) => x.slug !== p.slug && x.device === p.device);
  let list = same.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) || (a.brand === p.brand ? -1 : 0) - (b.brand === p.brand ? -1 : 0)).slice(0, 8);
  if (list.length < 4) {
    const more = ctx.products.filter((x) => x.slug !== p.slug && x.main === p.main && !list.includes(x) && x.available).slice(0, 8 - list.length);
    list = list.concat(more);
  }
  return list;
}

const noteItem = (n) => {
  const [t, ok] = noteText(n);
  return `<li${ok ? '' : ' lang="de"'}>${esc(t)}</li>`;
};

function productPage(ctx, p) {
  const imgs = ctx.productImages.get(p.slug) || [];
  const vs = p.variants || [];
  const start = Math.max(0, vs.findIndex((v) => v.available));
  const v0 = vs[start] || {};
  const cat = ctx.categories.find((c) => c.name === p.main);
  const dev = cat?.devices.find((d) => d.name === p.device);
  const trail = [HOME(), PRODUCTS()];
  if (cat) trail.push([mainName(cat.name), cat.url]);
  if (dev && cat.devices.length > 1) trail.push([deviceName(dev.name), dev.url]);
  trail.push([p.title, `/produkte/p/${p.slug}.html`]);
  const brandUrl = p.brand ? `/marken/${ctx.brandSlug(p.brand)}.html` : null;
  const text = describe(p);
  const vLabel = (v) => variantLabel(v.label) || v.artNr;

  const meta = [p.device ? deviceName(p.device) : null, driveName(p.drive), systemName(p.batterySystem)].filter(Boolean);
  const gallery = imgs.length
    ? `<div class="gal-main" data-gal-main tabindex="0" role="button" aria-label="${L('Bild vergrößern', 'Enlarge picture')}"><img id="pmain" src="${imgs[0].big}" alt="${esc(p.title)}" width="${imgs[0].bw}" height="${imgs[0].bh}" fetchpriority="high"></div>
${imgs.length > 1 ? `<div class="gal-thumbs" data-gal-thumbs>${imgs.map((im, i) => `<button type="button" class="${i ? '' : 'on'}" data-big="${im.big}" data-w="${im.bw}" data-h="${im.bh}"${im.look ? ` data-look="${esc(im.look)}"` : ''} aria-label="${L(`Bild ${i + 1} anzeigen`, `Show picture ${i + 1}`)}"><img src="${im.small}" alt="" width="${im.sw}" height="${im.sh}" loading="lazy"></button>`).join('')}</div>` : ''}`
    : `<div class="gal-main"><span class="noimg" style="display:grid;place-items:center;height:100%">${L('Bild folgt', 'Picture coming soon')}</span></div>`;

  const notStocked = L(', nicht vorrätig', ', out of stock');
  const variants = vs.length > 1
    ? (vs.length <= 8
      ? `<div class="variants"><b>${L('Ausführung', 'Version')}</b><div class="vlist" role="group" aria-label="${L('Ausführung wählen', 'Choose a version')}">${vs.map((v, i) => `<button type="button" data-variant="${i}" aria-pressed="${i === start}">${esc(vLabel(v))}${v.price != null ? `<small>${euro(v.price)}${v.available ? '' : notStocked}</small>` : ''}</button>`).join('')}</div></div>`
      : `<div class="variants"><label for="pvariant"><b>${L('Ausführung', 'Version')}</b></label><select class="vselect" id="pvariant" data-variant-select>${vs.map((v, i) => `<option value="${i}"${i === start ? ' selected' : ''}>${esc(vLabel(v))}${v.price != null ? `, ${euro(v.price)}` : ''}</option>`).join('')}</select></div>`)
    : '';

  const specRows = (rows) => rows.map(([k, v, m = 0]) => `<dt${deAttr(m & 1)}>${esc(k)}</dt><dd${deAttr(m & 2)}>${esc(v)}</dd>`).join('');
  const own = shownSpecs(v0.specs);
  const notes = v0.notes || [];
  const official = shownSpecs(p.officialSpecs);
  const rel = related(ctx, p);
  const description = clip(isEn()
    ? `${p.title}${p.price != null ? ` for ${vs.length > 1 ? 'from ' : ''}${euro(p.price)}` : ''} at Wilken Poelker in Ostrhauderfehn. ${p.available ? 'Available in our shop.' : 'We will be happy to order it for you.'} Advice, ready-to-use handover and service from our own workshop.`
    : `${p.title}${p.price != null ? ` für ${vs.length > 1 ? 'ab ' : ''}${euro(p.price)}` : ''} bei Wilken Poelker in Ostrhauderfehn. ${p.available ? 'Im Laden verfügbar.' : 'Wir bestellen es gern für Sie.'} Beratung, einsatzbereite Übergabe und Service aus eigener Werkstatt.`, 160);

  const pdata = {
    slug: p.slug, title: p.title, start,
    variants: vs.map((v) => ({ artNr: v.artNr, label: vLabel(v), look: v.look || '', price: v.price, uvp: v.uvp, isOffer: v.isOffer, available: v.available, specs: shownSpecs(v.specs), notes: (v.notes || []).map(noteText) })),
  };
  const linkAll = dev && cat.devices.length > 1
    ? `<a class="link-more" href="${dev.url}">${L(`Alle ${esc(dev.name)}`, `All ${esc(deviceName(dev.name).toLowerCase())}`)}${icon('arrow-right')}</a>`
    : (cat ? `<a class="link-more" href="${cat.url}">${L(`Alle ${esc(cat.name)}`, `All in ${esc(mainName(cat.name))}`)}${icon('arrow-right')}</a>` : '');

  const body = `
<section class="sec-tight" style="padding-top:clamp(12px,2vw,28px)">
<div class="wrap">
${C.crumbs(trail)}
<div class="pd">
<div class="pd-gal">${gallery}</div>
<div class="pd-info">
${p.brand ? `<a class="pd-brand" href="${brandUrl}">${esc(p.brand)}</a>` : ''}
<h1>${esc(p.title)}</h1>
${meta.length ? `<ul class="pd-meta">${meta.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
<div class="buy">
<div data-price>${variantPrice(v0)}</div>
<span class="vat">${L('inkl. MwSt., kein Versand: Kauf und Übergabe bei uns im Laden', 'incl. VAT, no shipping: purchase and handover in our shop')}</span>
<p class="avail${v0.available ? ' yes' : ''}" data-avail>${v0.available ? L('Bei uns im Laden verfügbar', 'Available in our shop') : L('Derzeit nicht vorrätig, wir bestellen gern für Sie', 'Currently out of stock, we will be happy to order it for you')}</p>
${variants}
<div class="btns"><button class="btn" type="button" data-dialog="inquiry">${icon('mail')}${L('Anfrage senden', 'Send inquiry')}</button><a class="btn btn-quiet" href="${COMPANY.phoneHref}">${icon('phone')}${COMPANY.phone}</a></div>
<div class="merk-row"><button class="btn btn-ghost btn-sm merk-btn" type="button" data-merk="${esc(p.slug)}" data-merk-g="${esc(ctx.deviceSlug(p))}" aria-pressed="false">${icon('bookmark')}<span data-merk-label>${L('Merken und vergleichen', 'Save and compare')}</span></button><a class="merk-go" href="/merkzettel.html" data-merk-go hidden>${L('Zum Merkzettel', 'Go to wishlist')}</a></div>
<p class="artnr" data-artnr-text>${v0.artNr ? `${L('Art.-Nr.', 'Item no.')} ${esc(v0.artNr)}` : ''}</p>
<ul class="promise">
<li>${icon('chat')}${L('Persönliche Beratung', 'Personal advice')}</li>
<li>${icon('check')}${L('Einsatzbereite Übergabe', 'Ready-to-use handover')}</li>
<li>${icon('wrench')}${L('Service in eigener Werkstatt', 'Service in our own workshop')}</li>
<li>${icon('truck')}${L('Lieferung in der Region', 'Delivery within the region')}</li>
</ul>
</div>
</div>
</div>
</div>
</section>
<section class="sec band">
<div class="wrap">
<div class="pd-text"><h2>${L('Über dieses Produkt', 'About this product')}</h2><p>${esc(text)}</p></div>
<div class="specs" style="margin-top:24px">
<div class="spec" data-variant-specs${own.length || notes.length ? '' : ' hidden'}><h2>${L('Ausstattung', 'Features')}</h2>${own.length ? `<dl>${specRows(own)}</dl>` : ''}${notes.length ? `<ul>${notes.map(noteItem).join('')}</ul>` : ''}</div>
${official.length ? `<div class="spec"><h2>${L('Technische Daten des Herstellers', 'Manufacturer’s technical data')}</h2><dl>${specRows(official)}</dl>${/^https?:\/\//i.test(p.officialUrl || '') ? `<p class="source">${L('Quelle', 'Source')}: <a href="${esc(p.officialUrl)}" target="_blank" rel="noopener nofollow">${esc(p.officialSource || L('Hersteller', 'Manufacturer'))}</a></p>` : ''}</div>` : ''}
</div>
<p class="note" style="margin-top:18px">${L('Alle Angaben ohne Gewähr, Änderungen und Irrtümer vorbehalten. Abbildungen können vom Original abweichen. UVP: unverbindliche Preisempfehlung des Herstellers. Produktbilder und technische Daten: © der jeweilige Hersteller.',
    'All information without guarantee, subject to change and errors. Pictures may differ from the original. RRP: the manufacturer’s recommended retail price. Product pictures and technical data: © the respective manufacturer. Some equipment details and manufacturer data are only available in German.')}</p>
</div>
</section>
${rel.length ? `<section class="sec"><div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Das könnte Sie auch interessieren', 'You may also be interested in')}</h2></div>${linkAll}</div>
<div class="rail">${cardsOf(ctx, rel)}</div>
</div></section>` : ''}
<dialog class="dlg" id="inquiry" aria-labelledby="inquiry-title">
<div class="dlg-head"><div><h2 id="inquiry-title">${L('Anfrage zu diesem Produkt', 'Inquiry about this product')}</h2><p>${esc(p.title)}</p></div><button class="icon-btn" type="button" data-dialog-close aria-label="${L('Schließen', 'Close')}">${icon('close')}</button></div>
<div class="dlg-body">${C.inquiryForm({ prefix: 'pi', product: p })}</div>
</dialog>
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="${L('Produktbild', 'Product picture')}"><button class="icon-btn" type="button" data-lb-close aria-label="${L('Schließen', 'Close')}">${icon('close')}</button><button class="icon-btn nav-b prev" type="button" data-lb-prev aria-label="${L('Vorheriges Bild', 'Previous picture')}">${icon('chevron-left')}</button><img alt="${esc(p.title)}"><button class="icon-btn nav-b next" type="button" data-lb-next aria-label="${L('Nächstes Bild', 'Next picture')}">${icon('chevron-right')}</button></div>
<script type="application/json" id="pdata">${json(pdata)}</script>`;

  return page(ctx, {
    path: `/produkte/p/${p.slug}.html`,
    nav: 'produkte',
    title: fitTitle(`${p.title} | Wilken Poelker Ostrhauderfehn`, `${p.title} | Wilken Poelker`, p.title),
    description,
    ogImage: imgs[0]?.big,
    ogType: 'product',
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.product(ctx, p, imgs, text), seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── Merkzettel: comparison data and the page ────────
// Rows of the comparison table: drive, battery system, the shop's own data of
// the first available variant, then the manufacturer's data sheet (same label
// only once; the explanations of the run-time rows are left out). Duplicates
// are found by the German label, the row shows the label of the page language.
const specKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9äöüß]+/g, '');
function compareRows(p) {
  const vs = p.variants || [];
  const v0 = vs[Math.max(0, vs.findIndex((v) => v.available))] || {};
  const rows = [];
  const seen = new Set();
  const add = (k, v, label) => {
    const key = specKey(k);
    if (!key || v == null || v === '' || seen.has(key) || /^erkl(ä|ae)rung/.test(key)) return;
    seen.add(key);
    const shown = label || specLabel(k);
    const mark = label ? 0 : germanMark(String(k).trim(), shown, String(v));
    rows.push(mark ? [shown, String(v), mark] : [shown, String(v)]);
  };
  add('Antrieb', driveName(p.drive), L('Antrieb', 'Power source'));
  if (p.batterySystem) add('Akku-System', systemName(p.batterySystem), L('Akku-System', 'Battery system'));
  for (const [k, v] of mergeSpecs(v0.specs)) add(k, v);
  for (const [k, v] of mergeSpecs(p.officialSpecs)) add(k, v);
  return rows;
}

function compareItem(ctx, p) {
  const img = ctx.productImages.get(p.slug)?.[0];
  return {
    s: p.slug, t: p.title, b: p.brand || '', p: p.price ?? null, m: (p.variants || []).length > 1 ? 1 : 0,
    u: p.isOffer && p.uvp && p.price != null && p.uvp > p.price ? p.uvp : null, a: p.available ? 1 : 0, i: img ? img.small : '',
    r: compareRows(p),
  };
}

function wishlistPage(ctx) {
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs([HOME(), PRODUCTS(), [L('Merkzettel', 'Wishlist'), '/merkzettel.html']])}
<h1>${L('Merkzettel', 'Wishlist')}</h1>
<p class="lead">${L('Sammeln Sie Geräte, die Sie interessieren, und vergleichen Sie Geräte derselben Art nebeneinander. Die Liste bleibt nur in diesem Browser. Mit einer Anfrage schicken Sie sie uns, und wir melden uns mit Verfügbarkeit und einer Empfehlung.',
    'Collect the products you are interested in and compare products of the same type side by side. The list stays in this browser only. Send it to us with an inquiry, and we will get back to you with availability and a recommendation.')}</p>
</div>
</section>
<section class="sec-tight merk-sec">
<div class="wrap" data-merk-page aria-live="polite">
<p class="muted" data-merk-loading>${L('Merkzettel wird geladen …', 'Loading wishlist …')}</p>
<noscript><p>${L('Für den Merkzettel wird JavaScript benötigt. Gern beraten wir Sie auch am Telefon:', 'The wishlist needs JavaScript. We are also happy to advise you by phone:')} <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>.</p></noscript>
</div>
</section>
<section class="sec band" id="anfrage" data-merk-ask hidden>
<div class="wrap merk-ask">
<div><h2>${L('Fragen zu diesen Produkten?', 'Questions about these products?')}</h2><p class="lead">${L('Schicken Sie uns Ihren Merkzettel. Ihre Liste kommt mit der Nachricht bei uns an, und wir melden uns mit Verfügbarkeit, Preisen und einer Empfehlung, gern auch telefonisch.',
    'Send us your wishlist. Your list reaches us together with your message, and we will get back to you with availability, prices and a recommendation, by phone if you prefer.')}</p></div>
<div class="prose-card">${C.inquiryForm({ prefix: 'mz', topic: 'allgemein', submit: L('Merkzettel senden', 'Send wishlist') })}</div>
</div>
</section>`;
  return page(ctx, {
    path: '/merkzettel.html',
    nav: 'merkzettel',
    title: L('Merkzettel und Vergleich | Wilken Poelker', 'Wishlist and comparison | Wilken Poelker'),
    description: L('Gemerkte Produkte von Wilken Poelker nebeneinander vergleichen und gesammelt anfragen.', 'Compare saved products of Wilken Poelker side by side and ask about them in one inquiry.'),
    scripts: ['assets/merkzettel.js'],
    noindex: true,
    body,
  });
}

module.exports = { compareItem, wishlistPage, overview, all, category, device, offersPage, brandsIndex, brandPage, productPage, recommended };
