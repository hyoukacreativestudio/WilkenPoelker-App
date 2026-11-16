// Product pages from the Taifun catalog (same data as the app's Produkte tab)
const { esc, euro, clip, json, plural, fitTitle } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY, MAIN, DEVICE, DRIVE, BRAND } = require('../content');
const seo = require('../seo');

const cardsOf = (ctx, list, n = 0) => list.map((p, i) => C.productCard(p, ctx.productImages.get(p.slug)?.[0], { eager: i < n })).join('');

// Recommended order: offers with the highest discount, then available, then name
const recommended = (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)
  || (b.available ? 1 : 0) - (a.available ? 1 : 0) || a.title.localeCompare(b.title, 'de');

// Filter panel + grid (catalog.js). fixed: facets that are not offered
function shop(ctx, list, { fixed = [], label = 'Produkte' } = {}) {
  const facet = (key, title) => (fixed.includes(key) ? '' : `<div data-facet="${key}"><h4>${title}</h4><div class="fchips"></div></div>`);
  return `<div class="shop" data-shop data-label="${esc(label)}">
<aside class="filters" id="filters" aria-label="Filter">
<div class="fsheet-head"><h2>Filter</h2><button class="icon-btn" type="button" data-f-close aria-label="Filter schließen">${icon('close')}</button></div>
<h4>Suche</h4><input type="search" data-f-q placeholder="Name, Hersteller, Modell" aria-label="In dieser Liste suchen">
<h4>Anzeigen</h4><div class="fchips"><button type="button" class="fchip" data-flag="avail" aria-pressed="false">Nur verfügbare</button><button type="button" class="fchip" data-flag="offer" aria-pressed="false">Nur Angebote</button></div>
${facet('main', 'Kategorie')}${facet('cat', 'Gerät')}${facet('drive', 'Antrieb')}${facet('sys', 'Akku-System')}${facet('brand', 'Hersteller')}
<h4>Preis in Euro</h4><div class="prices"><input type="number" data-f-min placeholder="von" min="0" inputmode="numeric" aria-label="Preis von"><span>bis</span><input type="number" data-f-max placeholder="bis" min="0" inputmode="numeric" aria-label="Preis bis"></div>
<p class="f-reset-row"><button type="button" class="btn btn-ghost btn-sm" data-f-reset>Filter zurücksetzen</button></p>
<div class="fsheet-foot"><button type="button" class="btn btn-ghost" data-f-reset>Zurücksetzen</button><button type="button" class="btn" data-f-close data-f-show>${plural(list.length, 'Produkt', 'Produkte')} anzeigen</button></div>
</aside>
<div>
<div class="shopbar"><b data-count aria-live="polite">${plural(list.length, 'Produkt', 'Produkte')}</b><span class="btns"><button type="button" class="btn btn-quiet btn-sm" id="ftoggle" aria-controls="filters" aria-expanded="false">${icon('filter')}Filter</button><select class="sortsel" data-sort aria-label="Sortierung"><option value="relevance">Empfohlen</option><option value="price_asc">Preis aufsteigend</option><option value="price_desc">Preis absteigend</option><option value="name">Name A bis Z</option></select></span></div>
<div class="pgrid" data-grid>${cardsOf(ctx, list, 4)}</div>
<div class="empty" data-empty hidden><p><b>Keine passenden Produkte.</b></p><p>Ändern Sie die Filter oder fragen Sie uns direkt: Vieles bestellen wir für Sie. Telefon <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>.</p></div>
</div>
</div>`;
}

// ── /produkte/ ───────────────────────────────────────
function overview(ctx) {
  const tiles = ctx.categories.map((c) => {
    const img = c.image;
    const devs = c.devices.slice(0, 4).map((d) => d.name).join(', ');
    return `<a class="tile" href="${c.url}"><span class="pimg">${img ? `<img src="${img.small}" alt="" width="${img.sw}" height="${img.sh}" loading="lazy">` : ''}</span><span class="tile-text"><b>${esc(c.name)}</b><small>${plural(c.count, 'Produkt', 'Produkte')}</small>${devs ? `<span class="tile-devs">${esc(devs)}</span>` : ''}</span></a>`;
  }).join('');
  const offers = ctx.products.filter((p) => p.isOffer && p.available).sort(recommended).slice(0, 12);
  const brands = ctx.brands.slice(0, 16);
  const legacy = Object.fromEntries(ctx.categories.map((c) => [c.name, c.url]));
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs([['Start', '/'], ['Produkte', '/produkte/']])}
<h1>Unsere Produkte</h1>
<p class="lead">${plural(ctx.products.length, 'Produkt', 'Produkte')} mit aktuellem Preis und Verfügbarkeit, direkt aus unserer Warenwirtschaft. Wir verschicken nichts: Beratung, Kauf und Übergabe finden persönlich bei uns in Ostrhauderfehn statt, auf Wunsch liefern wir in der Region.</p>
<div class="btns" style="margin-top:22px"><button class="btn" type="button" data-open="search-sheet">${icon('search')}Produkt suchen</button><a class="btn btn-quiet" href="/produkte/alle.html">${icon('filter')}Alle Produkte mit Filter</a><a class="btn btn-quiet" href="/angebote.html">${icon('tag')}Angebote</a></div>
</div>
</section>
<section class="sec-tight">
<div class="wrap">
<h2 class="sr">Kategorien</h2>
<div class="tiles">${tiles}</div>
</div>
</section>
${offers.length ? `<section class="sec band"><div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Aktuelle Angebote</h2><p>Reduzierte Geräte, die bei uns im Laden stehen.</p></div><a class="link-more" href="/angebote.html">Alle Angebote${icon('arrow-right')}</a></div>
<div class="rail">${cardsOf(ctx, offers)}</div>
</div></section>` : ''}
<section class="sec">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Marken, die halten</h2><p>Wir führen Hersteller, deren Ersatzteile es auch in vielen Jahren noch gibt.</p></div><a class="link-more" href="/marken/">Alle Marken${icon('arrow-right')}</a></div>
<div class="brandwall" style="margin-top:0">${brands.map((b) => `<a href="${b.url}">${esc(b.name)} <small>${b.count}</small></a>`).join('')}</div>
<div class="faces-wrap" style="margin-top:clamp(32px,5vw,56px)"><div><h3>Nicht gefunden, was Sie suchen?</h3><p>Hier sehen Sie, was wir im Laden haben. Vieles mehr bestellen wir für Sie, und unser Fahrradsortiment finden Sie im Fahrradkatalog.</p></div><div class="btns"><a class="btn" href="/kontakt.html">${icon('mail')}Anfrage stellen</a><a class="btn btn-quiet" href="/fahrraeder.html">${icon('bike')}Fahrradkatalog</a></div></div>
</div>
</section>
<script type="application/json" id="legacy-categories">${json(legacy)}</script>`;
  return page(ctx, {
    path: '/produkte/',
    nav: 'produkte',
    title: 'Produkte mit Preis und Verfügbarkeit | Wilken Poelker',
    description: `${ctx.products.length} Produkte von STIHL, Kärcher, Honda und mehr: Motorsägen, Rasenmäher, Hochdruckreiniger und E-Bikes mit Preis und Verfügbarkeit, in Ostrhauderfehn.`,
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, [['Start', '/'], ['Produkte', '/produkte/']])],
    body,
  });
}

// ── /produkte/alle.html ──────────────────────────────
function all(ctx) {
  const list = [...ctx.products].sort(recommended);
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs([['Start', '/'], ['Produkte', '/produkte/'], ['Alle Produkte', '/produkte/alle.html']])}
<h1>Alle Produkte</h1>
<p class="lead">Das ganze Sortiment aus unserem Laden, mit Filtern nach Kategorie, Gerät, Antrieb, Hersteller und Preis.</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list)}</div></section>`;
  return page(ctx, {
    path: '/produkte/alle.html',
    nav: 'produkte',
    title: 'Alle Produkte | Wilken Poelker Ostrhauderfehn',
    description: `Alle ${ctx.products.length} Produkte von Wilken Poelker mit Preis und Verfügbarkeit: filtern nach Kategorie, Gerät, Antrieb, Hersteller und Preis.`,
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, [['Start', '/'], ['Produkte', '/produkte/'], ['Alle Produkte', '/produkte/alle.html']])],
    body,
  });
}

// ── /produkte/<kategorie>/ ───────────────────────────
async function category(ctx, c) {
  const info = MAIN[c.name] || { title: c.name, intro: '' };
  const list = ctx.products.filter((p) => p.main === c.name).sort(recommended);
  const photo = info.photo ? await ctx.images.photo(info.photo) : null;
  const trail = [['Start', '/'], ['Produkte', '/produkte/'], [c.name, c.url]];
  const devs = c.devices.length > 1 ? `<div class="chips" style="margin-top:22px">${c.devices.map((d) => `<a class="chip" href="${d.url}">${esc(d.name)} <small>${d.count}</small></a>`).join('')}</div>` : '';
  const bikes = c.name === 'Fahrräder' ? `<p style="margin-top:18px"><a class="btn btn-quiet" href="/fahrraeder.html">${icon('bike')}Zum Fahrradkatalog mit allen Rädern</a></p>` : '';
  const body = `
<section class="phead">
<div class="wrap${photo ? ' phead-photo' : ''}">
<div>
${C.crumbs(trail)}
<h1>${esc(info.title)}</h1>
<p class="lead">${esc(info.intro)}</p>
${devs}${bikes}
</div>
${photo ? `<div class="ph">${C.photoImg(photo, { alt: `${c.name} in unserer Ausstellung`, sizes: '(max-width: 860px) 100vw, 40vw', eager: true })}</div>` : ''}
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list, { fixed: ['main'], label: c.name })}</div></section>`;
  return page(ctx, {
    path: c.url,
    nav: 'produkte',
    title: fitTitle(`${info.title} kaufen in Ostrhauderfehn | Wilken Poelker`, `${info.title} in Ostrhauderfehn | Wilken Poelker`, `${info.title} in Ostrhauderfehn`, `${info.title} | Wilken Poelker`),
    description: clip(`${info.title} bei Wilken Poelker in Ostrhauderfehn: ${list.length} Produkte mit Preis und Verfügbarkeit. ${info.intro}`, 158),
    ogImage: photo ? photo.large : undefined,
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.itemList(ctx, c.name, list)],
    body,
  });
}

// ── /produkte/<kategorie>/<geraet>.html ──────────────
function device(ctx, c, d) {
  const list = ctx.products.filter((p) => p.main === c.name && p.device === d.name).sort(recommended);
  const trail = [['Start', '/'], ['Produkte', '/produkte/'], [c.name, c.url], [d.name, d.url]];
  const brands = [...new Set(list.map((p) => p.brand).filter(Boolean))];
  const sentence = DEVICE[d.name] || `${d.name} bei Wilken Poelker.`;
  const others = c.devices.filter((x) => x.name !== d.name);
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${esc(d.name)}</h1>
<p class="lead">${esc(sentence)} ${list.length > 1 ? `${list.length} Modelle` : 'Ein Modell'}${brands.length ? ` von ${esc(brands.slice(0, 5).join(', '))}${brands.length > 5 ? ' und weiteren Herstellern' : ''}` : ''}, mit Beratung, einsatzbereiter Übergabe und Service aus unserer eigenen Werkstatt.</p>
${others.length ? `<div class="chips" style="margin-top:22px">${others.map((x) => `<a class="chip" href="${x.url}">${esc(x.name)} <small>${x.count}</small></a>`).join('')}</div>` : ''}
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list, { fixed: ['main', 'cat'], label: d.name })}</div></section>`;
  return page(ctx, {
    path: d.url,
    nav: 'produkte',
    title: fitTitle(`${d.name} kaufen in Ostrhauderfehn | Wilken Poelker`, `${d.name} in Ostrhauderfehn | Wilken Poelker`, `${d.name} in Ostrhauderfehn`, `${d.name} | Wilken Poelker`),
    description: clip(`${d.name} bei Wilken Poelker in Ostrhauderfehn: ${sentence} ${list.length} Modelle mit Preis und Verfügbarkeit${brands.length ? `, unter anderem von ${brands.slice(0, 3).join(', ')}` : ''}.`, 158),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.itemList(ctx, d.name, list)],
    body,
  });
}

// ── /angebote.html ───────────────────────────────────
function offersPage(ctx) {
  const list = ctx.products.filter((p) => p.isOffer).sort(recommended);
  const trail = [['Start', '/'], ['Angebote', '/angebote.html']];
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>Aktuelle Angebote</h1>
<p class="lead">${list.length ? `${plural(list.length, 'reduziertes Produkt', 'reduzierte Produkte')} aus unserem Sortiment, mit Preis und Verfügbarkeit aus unserer Warenwirtschaft.` : 'Gerade haben wir keine reduzierten Produkte.'} Weitere Aktionen und Neuheiten finden Sie in unserer App.</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">${list.length ? shop(ctx, list, { label: 'Angebote' }) : `<div class="empty"><p>Schauen Sie bald wieder vorbei, oder fragen Sie uns nach aktuellen Aktionen: <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>.</p></div>`}</div></section>`;
  return page(ctx, {
    path: '/angebote.html',
    nav: 'angebote',
    title: 'Angebote | Wilken Poelker Ostrhauderfehn',
    description: `Angebote bei Wilken Poelker in Ostrhauderfehn: ${list.length} reduzierte Produkte von STIHL, Kärcher und weiteren Marken, mit Beratung und Service aus eigener Werkstatt.`,
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── /marken/ ─────────────────────────────────────────
function brandsIndex(ctx) {
  const trail = [['Start', '/'], ['Marken', '/marken/']];
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>Unsere Marken</h1>
<p class="lead">Wir setzen bewusst auf renommierte Hersteller, deren Ersatzteile auch Jahre nach dem Kauf noch verfügbar sind. Das schützt Ihre Investition und macht Reparaturen möglich.</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">
<div class="brandwall">${ctx.brands.map((b) => `<a href="${b.url}">${esc(b.name)} <small>${plural(b.count, 'Produkt', 'Produkte')}</small></a>`).join('')}</div>
</div></section>`;
  return page(ctx, {
    path: '/marken/',
    nav: 'produkte',
    title: 'Marken: STIHL, Kärcher, Honda, Stiga und mehr | Wilken Poelker',
    description: clip(`Unsere Marken: ${ctx.brands.slice(0, 6).map((b) => b.name).join(', ')} und weitere. Mit Beratung, Übergabe und Service aus der eigenen Werkstatt in Ostrhauderfehn.`, 158),
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

function brandPage(ctx, b) {
  const list = ctx.products.filter((p) => p.brand === b.name).sort(recommended);
  const trail = [['Start', '/'], ['Marken', '/marken/'], [b.name, b.url]];
  const devices = [...new Set(list.map((p) => p.device).filter(Boolean))];
  const intro = BRAND[b.name] || `Produkte von ${b.name} bei Wilken Poelker in Ostrhauderfehn, mit Beratung, einsatzbereiter Übergabe und Service aus unserer eigenen Werkstatt.`;
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${esc(b.name)} bei Wilken Poelker</h1>
<p class="lead">${esc(intro)}</p>
${devices.length > 1 ? `<p class="muted" style="margin-top:12px">${esc(devices.slice(0, 10).join(', '))}</p>` : ''}
</div>
</section>
<section class="sec-tight"><div class="wrap">${shop(ctx, list, { fixed: ['brand'], label: b.name })}</div></section>`;
  return page(ctx, {
    path: b.url,
    nav: 'produkte',
    title: fitTitle(`${b.name} kaufen in Ostrhauderfehn | Wilken Poelker`, `${b.name} in Ostrhauderfehn | Wilken Poelker`, `${b.name} | Wilken Poelker`),
    description: clip(`${b.name} bei Wilken Poelker in Ostrhauderfehn: ${list.length} Produkte${devices.length ? ` wie ${devices.slice(0, 3).join(', ')}` : ''} mit Preis und Verfügbarkeit. ${intro}`, 158),
    scripts: ['assets/catalog.js'],
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.itemList(ctx, b.name, list)],
    body,
  });
}

// ── /produkte/p/<slug>.html ──────────────────────────
const germanNumber = (v) => String(v).replace(/^(\d+)\.(\d+)(?=\s|$)/, '$1,$2');

// Same label twice in a row (Leistung: kW and PS) -> one row
function mergeSpecs(rows) {
  const out = [];
  for (const [k, v] of rows || []) {
    const last = out[out.length - 1];
    if (last && last[0] === k) last[1] = `${last[1]} / ${germanNumber(v)}`;
    else out.push([k, germanNumber(v)]);
  }
  return out;
}

function describe(p) {
  const v0 = (p.variants || [])[0] || {};
  const facts = mergeSpecs(p.officialSpecs?.length ? p.officialSpecs : v0.specs).slice(0, 3);
  const parts = [];
  parts.push(`${p.title} gibt es bei Wilken Poelker in Ostrhauderfehn${p.available ? ', derzeit vorrätig in unserem Geschäft' : ''}.`);
  if (DEVICE[p.device]) parts.push(DEVICE[p.device]);
  if ((p.variants || []).length > 1) parts.push(`Erhältlich in ${p.variants.length} Ausführungen.`);
  if (facts.length) parts.push(`Wichtige Daten: ${facts.map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  if (!p.available) parts.push('Derzeit ist es nicht vorrätig, wir bestellen es gern für Sie.');
  if (p.main === 'Fahrräder') parts.push('Probefahrt auf unserer Teststrecke, Übergabe fahrbereit und Service in unserer eigenen Zweiradwerkstatt.');
  else if (p.brand === 'Kärcher') parts.push('Als autorisierter Kärcher-Händler beraten wir Sie persönlich und kümmern uns in unserer Kärcher-Werkstatt um Wartung und Reparatur.');
  else parts.push('Wir beraten Sie persönlich, übergeben das Gerät einsatzbereit mit Einweisung und kümmern uns in unserer eigenen Werkstatt um Wartung und Reparatur.');
  return parts.join(' ');
}

function variantPrice(v) {
  if (v.price == null) return '<span class="price">Preis auf Anfrage</span>';
  const save = v.isOffer && v.uvp && v.uvp > v.price ? Math.floor(((v.uvp - v.price) / v.uvp) * 100) : 0;
  return `<span class="price${v.isOffer ? ' offer' : ''}">${euro(v.price)}</span>${save ? ` <span class="uvp">UVP ${euro(v.uvp)}</span><span class="save"><span>−${save}&nbsp;%</span></span>` : ''}`;
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

function productPage(ctx, p) {
  const imgs = ctx.productImages.get(p.slug) || [];
  const vs = p.variants || [];
  const start = Math.max(0, vs.findIndex((v) => v.available));
  const v0 = vs[start] || {};
  const cat = ctx.categories.find((c) => c.name === p.main);
  const dev = cat?.devices.find((d) => d.name === p.device);
  const trail = [['Start', '/'], ['Produkte', '/produkte/']];
  if (cat) trail.push([cat.name, cat.url]);
  if (dev && cat.devices.length > 1) trail.push([dev.name, dev.url]);
  trail.push([p.title, `/produkte/p/${p.slug}.html`]);
  const brandUrl = p.brand ? `/marken/${ctx.brandSlug(p.brand)}.html` : null;
  const text = describe(p);

  const meta = [p.device, DRIVE[p.drive], p.batterySystem ? `${p.batterySystem}-System` : null].filter(Boolean);
  const gallery = imgs.length
    ? `<div class="gal-main" data-gal-main tabindex="0" role="button" aria-label="Bild vergrößern"><img id="pmain" src="${imgs[0].big}" alt="${esc(p.title)}" width="${imgs[0].bw}" height="${imgs[0].bh}" fetchpriority="high"></div>
${imgs.length > 1 ? `<div class="gal-thumbs" data-gal-thumbs>${imgs.map((im, i) => `<button type="button" class="${i ? '' : 'on'}" data-big="${im.big}" data-w="${im.bw}" data-h="${im.bh}"${im.look ? ` data-look="${esc(im.look)}"` : ''} aria-label="Bild ${i + 1} anzeigen"><img src="${im.small}" alt="" width="${im.sw}" height="${im.sh}" loading="lazy"></button>`).join('')}</div>` : ''}`
    : '<div class="gal-main"><span class="noimg" style="display:grid;place-items:center;height:100%">Bild folgt</span></div>';

  const variants = vs.length > 1
    ? (vs.length <= 8
      ? `<div class="variants"><b>Ausführung</b><div class="vlist" role="group" aria-label="Ausführung wählen">${vs.map((v, i) => `<button type="button" data-variant="${i}" aria-pressed="${i === start}">${esc(v.label || v.artNr)}${v.price != null ? `<small>${euro(v.price)}${v.available ? '' : ', nicht vorrätig'}</small>` : ''}</button>`).join('')}</div></div>`
      : `<div class="variants"><label for="pvariant"><b>Ausführung</b></label><select class="vselect" id="pvariant" data-variant-select>${vs.map((v, i) => `<option value="${i}"${i === start ? ' selected' : ''}>${esc(v.label || v.artNr)}${v.price != null ? `, ${euro(v.price)}` : ''}</option>`).join('')}</select></div>`)
    : '';

  const specRows = (rows) => rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const own = mergeSpecs(v0.specs);
  const notes = v0.notes || [];
  const official = mergeSpecs(p.officialSpecs);
  const rel = related(ctx, p);
  const description = clip(`${p.title}${p.price != null ? ` für ${vs.length > 1 ? 'ab ' : ''}${euro(p.price)}` : ''} bei Wilken Poelker in Ostrhauderfehn. ${p.available ? 'Im Laden verfügbar.' : 'Wir bestellen es gern für Sie.'} Beratung, einsatzbereite Übergabe und Service aus eigener Werkstatt.`, 160);

  const pdata = {
    slug: p.slug, title: p.title, start,
    variants: vs.map((v) => ({ artNr: v.artNr, label: v.label || '', look: v.look || '', price: v.price, uvp: v.uvp, isOffer: v.isOffer, available: v.available, specs: mergeSpecs(v.specs), notes: v.notes || [] })),
  };

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
<span class="vat">inkl. MwSt., kein Versand: Kauf und Übergabe bei uns im Laden</span>
<p class="avail${v0.available ? ' yes' : ''}" data-avail>${v0.available ? 'Bei uns im Laden verfügbar' : 'Derzeit nicht vorrätig, wir bestellen gern für Sie'}</p>
${variants}
<div class="btns"><button class="btn" type="button" data-dialog="inquiry">${icon('mail')}Anfrage senden</button><a class="btn btn-quiet" href="${COMPANY.phoneHref}">${icon('phone')}${COMPANY.phone}</a></div>
<p class="artnr" data-artnr-text>${v0.artNr ? `Art.-Nr. ${esc(v0.artNr)}` : ''}</p>
<ul class="promise">
<li>${icon('chat')}Persönliche Beratung</li>
<li>${icon('check')}Einsatzbereite Übergabe</li>
<li>${icon('wrench')}Service in eigener Werkstatt</li>
<li>${icon('truck')}Lieferung in der Region</li>
</ul>
</div>
</div>
</div>
</div>
</section>
<section class="sec band">
<div class="wrap">
<div class="pd-text"><h2>Über dieses Produkt</h2><p>${esc(text)}</p></div>
<div class="specs" style="margin-top:24px">
<div class="spec" data-variant-specs${own.length || notes.length ? '' : ' hidden'}><h2>Ausstattung</h2>${own.length ? `<dl>${specRows(own)}</dl>` : ''}${notes.length ? `<ul>${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>
${official.length ? `<div class="spec"><h2>Technische Daten des Herstellers</h2><dl>${specRows(official)}</dl>${p.officialUrl ? `<p class="source">Quelle: <a href="${esc(p.officialUrl)}" target="_blank" rel="noopener nofollow">${esc(p.officialSource || 'Hersteller')}</a></p>` : ''}</div>` : ''}
</div>
<p class="note" style="margin-top:18px">Alle Angaben ohne Gewähr, Änderungen und Irrtümer vorbehalten. Abbildungen können vom Original abweichen. Produktbilder und technische Daten: © der jeweilige Hersteller.</p>
</div>
</section>
${rel.length ? `<section class="sec"><div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Das könnte Sie auch interessieren</h2></div>${dev && cat.devices.length > 1 ? `<a class="link-more" href="${dev.url}">Alle ${esc(dev.name)}${icon('arrow-right')}</a>` : (cat ? `<a class="link-more" href="${cat.url}">Alle ${esc(cat.name)}${icon('arrow-right')}</a>` : '')}</div>
<div class="rail">${cardsOf(ctx, rel)}</div>
</div></section>` : ''}
<dialog class="dlg" id="inquiry" aria-labelledby="inquiry-title">
<div class="dlg-head"><div><h2 id="inquiry-title">Anfrage zu diesem Produkt</h2><p>${esc(p.title)}</p></div><button class="icon-btn" type="button" data-dialog-close aria-label="Schließen">${icon('close')}</button></div>
<div class="dlg-body">${C.inquiryForm({ prefix: 'pi', product: p })}</div>
</dialog>
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Produktbild"><button class="icon-btn" type="button" data-lb-close aria-label="Schließen">${icon('close')}</button><button class="icon-btn nav-b prev" type="button" data-lb-prev aria-label="Vorheriges Bild">${icon('chevron-left')}</button><img alt="${esc(p.title)}"><button class="icon-btn nav-b next" type="button" data-lb-next aria-label="Nächstes Bild">${icon('chevron-right')}</button></div>
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

module.exports = { overview, all, category, device, offersPage, brandsIndex, brandPage, productPage, recommended };
