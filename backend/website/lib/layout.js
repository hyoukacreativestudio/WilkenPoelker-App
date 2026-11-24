// Page frame: <head> with SEO tags, header with mega menu, the app-like tab
// bar on phones, menu + search sheets and the footer.
const { esc, json } = require('./util');
const { COMPANY, ADDRESS_LINE, MAPS } = require('./content');

const icon = (name, cls = '') => `<svg class="ic${cls ? ` ${cls}` : ''}" aria-hidden="true"><use href="/assets/icons.svg#${name}"/></svg>`;

const NAV = [
  { key: 'fahrraeder', href: '/fahrraeder.html', label: 'Fahrräder' },
  { key: 'service', href: '/service.html', label: 'Werkstatt' },
  { key: 'ueber-uns', href: '/ueber-uns.html', label: 'Über uns' },
  { key: 'app', href: '/app.html', label: 'App' },
  { key: 'kontakt', href: '/kontakt.html', label: 'Kontakt' },
];

const MENU = [
  ['home', '/', 'Startseite', 'home'],
  ['produkte', '/produkte/', 'Produkte', 'grid'],
  ['angebote', '/angebote.html', 'Angebote', 'tag'],
  ['merkzettel', '/merkzettel.html', 'Merkzettel', 'bookmark'],
  ['fahrraeder', '/fahrraeder.html', 'Fahrräder und E-Bikes', 'bike'],
  ['leasing', '/e-bike-leasing.html', 'E-Bike-Leasing', 'euro'],
  ['service', '/service.html', 'Werkstatt und Service', 'wrench'],
  ['ueber-uns', '/ueber-uns.html', 'Über uns und Team', 'users'],
  ['karriere', '/karriere.html', 'Karriere', 'heart'],
  ['app', '/app.html', 'Unsere App', 'smartphone'],
  ['kontakt', '/kontakt.html', 'Kontakt und Anfahrt', 'pin'],
];

function logo() {
  return `<img src="/assets/img/logo-400.png" alt="Wilken Poelker" width="400" height="72">`;
}

function header(ctx, nav) {
  const cats = ctx.categories.map((c) => `<a href="${c.url}">${icon(c.icon)}<span><b>${esc(c.name)}</b><small>${c.count} ${c.count === 1 ? 'Produkt' : 'Produkte'}</small></span></a>`).join('');
  const links = NAV.map((n) => `<a href="${n.href}"${nav === n.key ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  return `<header class="top" id="top">
<div class="wrap top-in">
<a class="brand" href="/" aria-label="Wilken Poelker, zur Startseite">${logo()}</a>
<nav class="nav" aria-label="Hauptnavigation">
<div class="mega"><button type="button" aria-expanded="false" aria-controls="mega-produkte"${['produkte', 'angebote'].includes(nav) ? ' aria-current="page"' : ''}>Produkte${icon('chevron-down')}</button>
<div class="mega-panel" id="mega-produkte">${cats}<div class="mega-foot"><a href="/produkte/">Alle Kategorien</a><a href="/angebote.html">Angebote</a><a href="/marken/">Marken</a></div></div></div>
${links}
</nav>
<div class="top-tools">
<a class="status" href="/kontakt.html#oeffnungszeiten" data-status data-status-short><span class="dot"></span><span data-status-text>Öffnungszeiten</span></a>
<a class="icon-btn merk-link" href="/merkzettel.html" data-merk-link hidden aria-label="Merkzettel">${icon('bookmark')}<span class="merk-n" data-merk-n></span></a>
<button class="icon-btn" type="button" data-open="search-sheet" aria-label="Produkte suchen">${icon('search')}</button>
<button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="Zwischen hellem und dunklem Design wechseln">${icon('sun', 'sun')}${icon('moon', 'moon')}</button>
<a class="btn btn-sm call-btn" href="${COMPANY.phoneHref}" aria-label="Anrufen: ${COMPANY.phone}">${icon('phone')}<span class="call-t">${COMPANY.phone}</span></a>
</div>
</div>
</header>`;
}

function tabbar(nav) {
  const tab = (key, href, label, ic) => `<a href="${href}"${nav === key ? ' aria-current="page"' : ''}>${icon(ic)}${label}</a>`;
  return `<nav class="tabbar" aria-label="Schnellzugriff">
${tab('home', '/', 'Start', 'home')}
${tab('produkte', '/produkte/', 'Produkte', 'grid')}
${tab('service', '/service.html', 'Werkstatt', 'wrench')}
${tab('kontakt', '/kontakt.html', 'Kontakt', 'pin')}
<button type="button" data-open="menu-sheet">${icon('menu')}Menü</button>
</nav>`;
}

function sheets(ctx, nav) {
  const items = MENU.map(([key, href, label, ic]) => `<li><a href="${href}"${nav === key ? ' aria-current="page"' : ''}>${icon(ic)}${label}${key === 'merkzettel' ? '<span class="merk-n" data-merk-n></span>' : ''}</a></li>`).join('');
  const chips = ctx.categories.map((c) => `<a class="chip" href="${c.url}">${esc(c.name)}</a>`).join('');
  return `<div class="sheet" id="menu-sheet" role="dialog" aria-modal="true" aria-labelledby="menu-title">
<div class="sheet-card">
<div class="sheet-head"><h2 id="menu-title">Menü</h2><button class="icon-btn" type="button" data-close aria-label="Menü schließen">${icon('close')}</button></div>
<div class="sheet-body">
<ul class="menu-list">${items}</ul>
<div class="menu-info">
<span class="status" data-status><span class="dot"></span><span data-status-text>Öffnungszeiten</span></span>
<div class="btns"><a class="btn btn-sm" href="${COMPANY.phoneHref}">${icon('phone')}Anrufen</a><a class="btn btn-sm btn-quiet" href="${MAPS.route}" rel="noopener" target="_blank">${icon('route')}Route planen</a></div>
<small class="muted">${esc(COMPANY.legalName)}, ${esc(ADDRESS_LINE)}</small>
</div>
</div>
</div>
</div>
<div class="sheet" id="search-sheet" role="dialog" aria-modal="true" aria-labelledby="search-title">
<div class="sheet-card">
<div class="sheet-head"><h2 id="search-title">Produkte suchen</h2><button class="icon-btn" type="button" data-close aria-label="Suche schließen">${icon('close')}</button></div>
<div class="sheet-body">
<label class="search-field">${icon('search')}<span class="sr">Suchbegriff</span><input type="search" id="search-input" placeholder="Name, Hersteller oder Modell, z.&nbsp;B. MS 182" autocomplete="off" enterkeyhint="search"></label>
<div class="search-results" id="search-results" role="listbox" aria-label="Suchergebnisse"></div>
<p class="search-hint" id="search-hint">Oder stöbern Sie in einer Kategorie:</p>
<div class="search-cats">${chips}<a class="chip" href="/angebote.html">Angebote</a></div>
</div>
</div>
</div>`;
}

function footer(ctx) {
  const cats = ctx.categories.map((c) => `<li><a href="${c.url}">${esc(c.name)}</a></li>`).join('');
  const year = new Date().getFullYear();
  return `<footer class="foot">
<div class="wrap">
<div class="foot-cta">
<p class="foot-claim">Wir freuen uns auf Ihren Besuch in Ostrhauderfehn.</p>
<div class="btns"><a class="btn" href="${MAPS.route}" rel="noopener" target="_blank">${icon('route')}Route planen</a><a class="btn btn-line" href="${COMPANY.phoneHref}">${icon('phone')}${COMPANY.phone}</a></div>
</div>
<div class="foot-grid">
<div class="foot-brand">
<img src="/assets/img/logo-400.png" alt="Wilken Poelker" width="400" height="72" loading="lazy">
<img class="claim" src="/assets/img/logo-claim.png" alt="Für jedermann, ob Privat oder Profi" width="340" height="116" loading="lazy">
<p>Familienbetrieb in dritter Generation. Seit 1951 beraten, verkaufen und reparieren wir in Ostrhauderfehn: E-Bikes und Fahrräder, Motor- und Gartengeräte, Reinigungstechnik.</p>
<div class="foot-social"><a href="${COMPANY.facebook}" rel="noopener" target="_blank" aria-label="Wilken Poelker bei Facebook">${icon('facebook')}</a><a href="${COMPANY.instagram}" rel="noopener" target="_blank" aria-label="Wilken Poelker bei Instagram">${icon('instagram')}</a></div>
</div>
<div><h2>Sortiment</h2><ul>${cats}<li><a href="/angebote.html">Angebote</a></li><li><a href="/marken/">Marken</a></li></ul></div>
<div><h2>Service</h2><ul><li><a href="/service.html">Werkstatt und Service</a></li><li><a href="/fahrraeder.html">Fahrradkatalog</a></li><li><a href="/e-bike-leasing.html">E-Bike-Leasing</a></li><li><a href="/app.html">Unsere App</a></li><li><a href="/ueber-uns.html">Über uns</a></li><li><a href="/karriere.html">Karriere</a></li></ul></div>
<div><h2>Kontakt</h2><ul>
<li>${esc(COMPANY.legalName)}<br>${esc(COMPANY.street)}<br>${COMPANY.zip} ${COMPANY.city}</li>
<li><a href="${COMPANY.phoneHref}">Telefon ${COMPANY.phone}</a></li>
<li><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></li>
<li><a href="/kontakt.html#oeffnungszeiten">Öffnungszeiten</a></li>
<li><a href="${MAPS.route}" rel="noopener" target="_blank">Route planen</a></li>
</ul></div>
</div>
<div class="foot-legal"><span>© ${year} ${esc(COMPANY.legalName)}</span><span>Alle Preise inkl. MwSt. Kein Versand, Beratung und Kauf bei uns vor Ort.</span><a class="push" href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutz</a></div>
</div>
</footer>`;
}

// Opening hours for the live status (computed in the browser until the API answers)
function hoursData(ctx) {
  const pick = (s) => (s || []).map((d) => ({ d: d.dayOfWeek, c: !!d.isClosed, p: (d.periods || []).map((p) => [p.open, p.close]) }));
  return json({
    standard: pick(ctx.hours.standard),
    winter: pick(ctx.hours.winter),
    closed: ctx.closedDays.map((c) => ({ date: c.date, name: c.name, c: !!c.isClosed, p: (c.specialHours || []).map((p) => [p.open, p.close]) })),
  });
}

/**
 * page({ path, title, description, nav, body, jsonLd, ogImage, ogType, scripts, head, smartBanner, noindex })
 * path: URL path of the page, e.g. "/produkte/p/stihl-ms-182.html"
 */
function page(ctx, o) {
  const canonical = `${ctx.base}${o.path}`;
  const robots = ctx.mode === 'live' && !o.noindex ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
  const og = o.ogImage ? (o.ogImage.startsWith('http') ? o.ogImage : `${ctx.base}${o.ogImage}`) : `${ctx.base}${ctx.ogDefault}`;
  const ld = (o.jsonLd || []).filter(Boolean).map((d) => `<script type="application/ld+json">${json(d)}</script>`).join('\n');
  const scripts = (o.scripts || []).map((s) => `<script src="${ctx.asset(s)}" defer></script>`).join('');
  return `<!doctype html>
<html lang="de" data-api="${esc(ctx.apiPublic)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${robots}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1520" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">
${o.smartBanner ? `<meta name="apple-itunes-app" content="app-id=${COMPANY.appleAppId}">\n` : ''}<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="Wilken Poelker">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/img/favicon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-title" content="Wilken Poelker">
<link rel="preconnect" href="${esc(ctx.apiPublic)}" crossorigin>
<link rel="preload" href="/assets/fonts/HankenGrotesk-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/BricolageGrotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset('assets/site.css')}">
<script>(function(d){d.classList.add('js');try{var t=localStorage.getItem('wp-theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}})(document.documentElement)</script>
<script src="${ctx.asset('assets/site.js')}" defer></script>${scripts}
${o.head || ''}${ld}
</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
${header(ctx, o.nav)}
<main id="main">
${o.body}
</main>
${footer(ctx)}
${tabbar(o.nav)}
${sheets(ctx, o.nav)}
<script type="application/json" id="hours-data">${hoursData(ctx)}</script>
</body>
</html>
`;
}

module.exports = { page, icon, logo };
