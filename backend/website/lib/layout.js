// Page frame: <head> with SEO tags, header with mega menu, the app-like tab
// bar on phones, menu + search sheets and the footer.
const crypto = require('crypto');
const { esc, json } = require('./util');
const { COMPANY, ADDRESS_LINE, MAPS } = require('./content');
const { L, isEn, lang, HOLIDAY_EN } = require('./i18n');

const icon = (name, cls = '') => `<svg class="ic${cls ? ` ${cls}` : ''}" aria-hidden="true"><use href="/assets/icons.svg#${name}"/></svg>`;

const nav = () => [
  { key: 'fahrraeder', href: '/fahrraeder.html', label: L('Fahrräder', 'Bicycles') },
  { key: 'service', href: '/service.html', label: L('Werkstatt', 'Workshop') },
  { key: 'ueber-uns', href: '/ueber-uns.html', label: L('Über uns', 'About us') },
  { key: 'app', href: '/app.html', label: 'App' },
  { key: 'kontakt', href: '/kontakt.html', label: L('Kontakt', 'Contact') },
];

const menu = () => [
  ['home', '/', L('Startseite', 'Home'), 'home'],
  ['produkte', '/produkte/', L('Produkte', 'Products'), 'grid'],
  ['angebote', '/angebote.html', L('Angebote', 'Offers'), 'tag'],
  ['merkzettel', '/merkzettel.html', L('Merkzettel', 'Wishlist'), 'bookmark'],
  ['fahrraeder', '/fahrraeder.html', L('Fahrräder und E-Bikes', 'Bicycles and e-bikes'), 'bike'],
  ['leasing', '/e-bike-leasing.html', L('E-Bike-Leasing', 'E-bike leasing'), 'euro'],
  ['service', '/service.html', L('Werkstatt und Service', 'Workshop and service'), 'wrench'],
  ['ueber-uns', '/ueber-uns.html', L('Über uns und Team', 'About us and team'), 'users'],
  ['karriere', '/karriere.html', L('Karriere', 'Careers'), 'heart'],
  ['app', '/app.html', L('Unsere App', 'Our app'), 'smartphone'],
  ['kontakt', '/kontakt.html', L('Kontakt und Anfahrt', 'Contact and directions'), 'pin'],
];

function logo() {
  return `<img src="/assets/img/logo-400.png" alt="Wilken Poelker" width="400" height="72">`;
}

// The link to the same page in the other language. Written after the English
// pages got their addresses (page()), so it keeps the address it was given.
const LANG_SWITCH = '<!--wp-lang-switch-->';
const LANG_SWITCH_MENU = '<!--wp-lang-switch-menu-->';
const LANG_SWITCH_FOOT = '<!--wp-lang-switch-foot-->';

function header(ctx, navKey) {
  const cats = ctx.categories.map((c) => `<a href="${c.url}">${icon(c.icon)}<span><b>${esc(c.label)}</b><small>${c.count} ${c.count === 1 ? L('Produkt', 'product') : L('Produkte', 'products')}</small></span></a>`).join('');
  const links = nav().map((n) => `<a href="${n.href}"${navKey === n.key ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  return `<header class="top" id="top">
<div class="wrap top-in">
<a class="brand" href="/" aria-label="${L('Wilken Poelker, zur Startseite', 'Wilken Poelker, home page')}">${logo()}</a>
<nav class="nav" aria-label="${L('Hauptnavigation', 'Main navigation')}">
<div class="mega"><button type="button" aria-expanded="false" aria-controls="mega-produkte"${['produkte', 'angebote'].includes(navKey) ? ' aria-current="page"' : ''}>${L('Produkte', 'Products')}${icon('chevron-down')}</button>
<div class="mega-panel" id="mega-produkte">${cats}<div class="mega-foot"><a href="/produkte/">${L('Alle Kategorien', 'All categories')}</a><a href="/angebote.html">${L('Angebote', 'Offers')}</a><a href="/marken/">${L('Marken', 'Brands')}</a></div></div></div>
${links}
</nav>
<div class="top-tools">
<a class="status" href="/kontakt.html#oeffnungszeiten" data-status data-status-short><span class="dot"></span><span data-status-text>${L('Öffnungszeiten', 'Opening hours')}</span></a>
<a class="icon-btn merk-link" href="/merkzettel.html" data-merk-link hidden aria-label="${L('Merkzettel', 'Wishlist')}">${icon('bookmark')}<span class="merk-n" data-merk-n></span></a>
<button class="icon-btn" type="button" data-open="search-sheet" aria-label="${L('Produkte suchen', 'Search products')}">${icon('search')}</button>
${LANG_SWITCH}
<button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="${L('Zwischen hellem und dunklem Design wechseln', 'Switch between light and dark design')}">${icon('sun', 'sun')}${icon('moon', 'moon')}</button>
<a class="btn btn-sm call-btn" href="${COMPANY.phoneHref}" aria-label="${L('Anrufen', 'Call')}: ${COMPANY.phone}">${icon('phone')}<span class="call-t">${COMPANY.phone}</span></a>
</div>
</div>
</header>`;
}

function tabbar(navKey) {
  const tab = (key, href, label, ic) => `<a href="${href}"${navKey === key ? ' aria-current="page"' : ''}>${icon(ic)}${label}</a>`;
  return `<nav class="tabbar" aria-label="${L('Schnellzugriff', 'Quick access')}">
${tab('home', '/', L('Start', 'Home'), 'home')}
${tab('produkte', '/produkte/', L('Produkte', 'Products'), 'grid')}
${tab('service', '/service.html', L('Werkstatt', 'Workshop'), 'wrench')}
${tab('kontakt', '/kontakt.html', L('Kontakt', 'Contact'), 'pin')}
<button type="button" data-open="menu-sheet">${icon('menu')}${L('Menü', 'Menu')}</button>
</nav>`;
}

function sheets(ctx, navKey) {
  const items = menu().map(([key, href, label, ic]) => `<li><a href="${href}"${navKey === key ? ' aria-current="page"' : ''}>${icon(ic)}${label}${key === 'merkzettel' ? '<span class="merk-n" data-merk-n></span>' : ''}</a></li>`).join('');
  const chips = ctx.categories.map((c) => `<a class="chip" href="${c.url}">${esc(c.label)}</a>`).join('');
  return `<div class="sheet" id="menu-sheet" role="dialog" aria-modal="true" aria-labelledby="menu-title">
<div class="sheet-card">
<div class="sheet-head"><h2 id="menu-title">${L('Menü', 'Menu')}</h2><button class="icon-btn" type="button" data-close aria-label="${L('Menü schließen', 'Close menu')}">${icon('close')}</button></div>
<div class="sheet-body">
<ul class="menu-list">${items}${LANG_SWITCH_MENU}</ul>
<div class="menu-info">
<span class="status" data-status><span class="dot"></span><span data-status-text>${L('Öffnungszeiten', 'Opening hours')}</span></span>
<div class="btns"><a class="btn btn-sm" href="${COMPANY.phoneHref}">${icon('phone')}${L('Anrufen', 'Call')}</a><a class="btn btn-sm btn-quiet" href="${MAPS.route}" rel="noopener" target="_blank">${icon('route')}${L('Route planen', 'Get directions')}</a></div>
<small class="muted">${esc(COMPANY.legalName)}, ${esc(ADDRESS_LINE)}</small>
</div>
</div>
</div>
</div>
<div class="sheet" id="search-sheet" role="dialog" aria-modal="true" aria-labelledby="search-title">
<div class="sheet-card">
<div class="sheet-head"><h2 id="search-title">${L('Produkte suchen', 'Search products')}</h2><button class="icon-btn" type="button" data-close aria-label="${L('Suche schließen', 'Close search')}">${icon('close')}</button></div>
<div class="sheet-body">
<label class="search-field">${icon('search')}<span class="sr">${L('Suchbegriff', 'Search term')}</span><input type="search" id="search-input" placeholder="${L('Name, Hersteller oder Modell, z.&nbsp;B. MS 182', 'Name, brand or model, e.g. MS 182')}" autocomplete="off" enterkeyhint="search"></label>
<div class="search-results" id="search-results" role="listbox" aria-label="${L('Suchergebnisse', 'Search results')}"></div>
<p class="search-hint" id="search-hint">${L('Oder stöbern Sie in einer Kategorie:', 'Or browse a category:')}</p>
<div class="search-cats">${chips}<a class="chip" href="/angebote.html">${L('Angebote', 'Offers')}</a></div>
</div>
</div>
</div>`;
}

function footer(ctx) {
  const cats = ctx.categories.map((c) => `<li><a href="${c.url}">${esc(c.label)}</a></li>`).join('');
  const year = new Date().getFullYear();
  return `<footer class="foot">
<div class="wrap">
<div class="foot-cta">
<p class="foot-claim">${L('Wir freuen uns auf Ihren Besuch in Ostrhauderfehn.', 'We look forward to your visit in Ostrhauderfehn.')}</p>
<div class="btns"><a class="btn" href="${MAPS.route}" rel="noopener" target="_blank">${icon('route')}${L('Route planen', 'Get directions')}</a><a class="btn btn-line" href="${COMPANY.phoneHref}">${icon('phone')}${COMPANY.phone}</a></div>
</div>
<div class="foot-grid">
<div class="foot-brand">
<img src="/assets/img/logo-400.png" alt="Wilken Poelker" width="400" height="72" loading="lazy">
<img class="claim" src="/assets/img/logo-claim.png" alt="${L('Für jedermann, ob Privat oder Profi', 'For everyone, private or professional')}" width="340" height="116" loading="lazy">
<p>${L('Familienbetrieb in dritter Generation. Seit 1951 beraten, verkaufen und reparieren wir in Ostrhauderfehn: E-Bikes und Fahrräder, Motor- und Gartengeräte, Reinigungstechnik.', 'A family business in its third generation. Since 1951 we have been advising, selling and repairing in Ostrhauderfehn: e-bikes and bicycles, power and garden tools, cleaning equipment.')}</p>
<div class="foot-social"><a href="${COMPANY.facebook}" rel="noopener" target="_blank" aria-label="${L('Wilken Poelker bei Facebook', 'Wilken Poelker on Facebook')}">${icon('facebook')}</a><a href="${COMPANY.instagram}" rel="noopener" target="_blank" aria-label="${L('Wilken Poelker bei Instagram', 'Wilken Poelker on Instagram')}">${icon('instagram')}</a></div>
</div>
<div><h2>${L('Sortiment', 'Our range')}</h2><ul>${cats}<li><a href="/angebote.html">${L('Angebote', 'Offers')}</a></li><li><a href="/marken/">${L('Marken', 'Brands')}</a></li></ul></div>
<div><h2>Service</h2><ul><li><a href="/service.html">${L('Werkstatt und Service', 'Workshop and service')}</a></li><li><a href="/fahrraeder.html">${L('Fahrradkatalog', 'Bike catalogue')}</a></li><li><a href="/e-bike-leasing.html">${L('E-Bike-Leasing', 'E-bike leasing')}</a></li><li><a href="/app.html">${L('Unsere App', 'Our app')}</a></li><li><a href="/ueber-uns.html">${L('Über uns', 'About us')}</a></li><li><a href="/karriere.html">${L('Karriere', 'Careers')}</a></li></ul></div>
<div><h2>${L('Kontakt', 'Contact')}</h2><ul>
<li>${esc(COMPANY.legalName)}<br>${esc(COMPANY.street)}<br>${COMPANY.zip} ${COMPANY.city}${L('', '<br>Germany')}</li>
<li><a href="${COMPANY.phoneHref}">${L('Telefon', 'Phone')} ${COMPANY.phone}</a></li>
<li><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></li>
<li><a href="/kontakt.html#oeffnungszeiten">${L('Öffnungszeiten', 'Opening hours')}</a></li>
<li><a href="${MAPS.route}" rel="noopener" target="_blank">${L('Route planen', 'Get directions')}</a></li>
</ul></div>
</div>
<div class="foot-legal"><span>© ${year} ${esc(COMPANY.legalName)}</span><span>${L('Alle Preise inkl. MwSt. UVP: unverbindliche Preisempfehlung des Herstellers. Kein Versand, Beratung und Kauf bei uns vor Ort.', 'All prices include VAT. RRP: the manufacturer’s recommended retail price. No shipping, advice and purchase at our shop.')}</span><a class="push" href="/impressum.html">${L('Impressum', 'Legal notice')}</a><a href="/datenschutz.html">${L('Datenschutz', 'Privacy')}</a><a href="/barrierefreiheit.html">${L('Barrierefreiheit', 'Accessibility')}</a>${LANG_SWITCH_FOOT}</div>
</div>
</footer>`;
}

// Light/dark choice before the first paint (the only inline script, allowed by its hash)
const THEME_JS = "(function(d){d.classList.add('js');try{var t=localStorage.getItem('wp-theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}})(document.documentElement)";
const THEME_HASH = `'sha256-${crypto.createHash('sha256').update(THEME_JS).digest('base64')}'`;

// Content Security Policy: what a page may load. Besides our own files only the
// app server (live status, reviews, forms) and the Google Maps map (after
// consent). frame-ancestors is set in .htaccess (not possible in a meta tag).
// The bike page is the exception: the BIDEX catalogue (after consent) works with
// inline scripts and event handlers, frames and further providers (financing,
// size advice) that change without notice, so there only plugins and a foreign
// <base> are blocked.
function csp(ctx, thirdParty = false) {
  if (thirdParty) return "object-src 'none'; base-uri 'self'";
  const api = new URL(ctx.apiPublic).origin;
  return [
    "default-src 'self'",
    `script-src 'self' ${THEME_HASH}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${api}`,
    "font-src 'self'",
    `connect-src 'self' ${api}`,
    'frame-src https://www.google.com https://maps.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
  ].join('; ');
}

// Opening hours for the live status (computed in the browser until the API answers)
function hoursData(ctx) {
  const pick = (s) => (s || []).map((d) => ({ d: d.dayOfWeek, c: !!d.isClosed, p: (d.periods || []).map((p) => [p.open, p.close]) }));
  return json({
    standard: pick(ctx.hours.standard),
    winter: pick(ctx.hours.winter),
    closed: ctx.closedDays.map((c) => ({ date: c.date, name: c.name, c: !!c.isClosed, p: (c.specialHours || []).map((p) => [p.open, p.close]) })),
    // English pages: holiday names of the app server (German) in English
    ...(isEn() ? { hn: HOLIDAY_EN } : {}),
  });
}

// The switch to the other language: header (wide screens), menu and footer
function langLinks(ctx, dePath) {
  // The error page has no counterpart worth visiting: the other start page
  const missing = dePath === '/404.html';
  const target = missing ? (isEn() ? '/' : '/en/') : (isEn() ? dePath : ctx.toEn(dePath));
  const [label, hreflang, title] = isEn()
    ? ['Deutsch', 'de', missing ? 'Zur deutschen Startseite' : 'Diese Seite auf Deutsch']
    : ['English', 'en', missing ? 'English home page' : 'This page in English'];
  const attrs = `href="${esc(target)}" hreflang="${hreflang}" lang="${hreflang}"`;
  return {
    // Header: globe and the short code (DE / EN), the name for screen readers
    head: `<a class="lang-link" ${attrs} title="${title}" aria-label="${label}">${icon('globe')}<span aria-hidden="true">${hreflang.toUpperCase()}</span></a>`,
    menu: `<li><a ${attrs}>${icon('globe')}${title}</a></li>`,
    foot: `<a class="lang-foot" ${attrs}>${icon('globe')}<span>${label}</span></a>`,
  };
}

/**
 * page({ path, title, description, nav, body, jsonLd, ogImage, ogType, scripts, head, smartBanner, noindex })
 * path: German URL path of the page, e.g. "/produkte/p/stihl-ms-182.html". On
 * the English pass every link to one of our pages is changed to the English
 * page (ctx.localize, set by build.js).
 */
function page(ctx, o) {
  const dePath = o.path;
  const enPath = ctx.toEn ? ctx.toEn(dePath) : dePath;
  const ownPath = isEn() ? enPath : dePath;
  const canonical = `${ctx.base}${ownPath}`;
  const robots = ctx.mode === 'live' && !o.noindex ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
  const og = o.ogImage ? (o.ogImage.startsWith('http') ? o.ogImage : `${ctx.base}${o.ogImage}`) : `${ctx.base}${ctx.ogDefault}`;
  const ld = (o.jsonLd || []).filter(Boolean).map((d) => `<script type="application/ld+json">${json(d)}</script>`).join('\n');
  const scripts = (o.scripts || []).map((s) => `<script src="${ctx.asset(s)}" defer></script>`).join('');
  // Both languages of a page point to each other (not the 404 page)
  const alternates = o.noAlternates ? '' : `<link rel="alternate" hreflang="de" href="${esc(ctx.base + dePath)}">
<link rel="alternate" hreflang="en" href="${esc(ctx.base + enPath)}">
<link rel="alternate" hreflang="x-default" href="${esc(ctx.base + dePath)}">
`;
  const html = `<!doctype html>
<html lang="${lang()}" data-api="${esc(ctx.apiPublic)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${esc(csp(ctx, o.thirdParty))}">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(canonical)}">
<!--wp-alternates--><meta name="robots" content="${robots}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1520" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">
${o.smartBanner ? `<meta name="apple-itunes-app" content="app-id=${COMPANY.appleAppId}">\n` : ''}<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:locale" content="${L('de_DE', 'en_GB')}">
<meta property="og:locale:alternate" content="${L('en_GB', 'de_DE')}">
<meta property="og:site_name" content="Wilken Poelker">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/img/favicon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="${L('/manifest.webmanifest', '/en/manifest.webmanifest')}">
<meta name="apple-mobile-web-app-title" content="Wilken Poelker">
<link rel="preconnect" href="${esc(ctx.apiPublic)}" crossorigin>
<link rel="preload" href="/assets/fonts/HankenGrotesk-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/BricolageGrotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset('assets/site.css')}">
<script>${THEME_JS}</script>
<script src="${ctx.asset('assets/site.js')}" defer></script>${scripts}
${o.head || ''}${ld}
</head>
<body>
<a class="skip" href="#main">${L('Zum Inhalt springen', 'Skip to content')}</a>
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
  // English pass: German addresses -> English ones; "@de:/x" marks a link that
  // stays German on purpose ("German version is binding")
  const out = (isEn() && ctx.localize ? ctx.localize(html) : html).replace(/"@de:\//g, '"/');
  const sw = langLinks(ctx, dePath);
  return out.replace('<!--wp-alternates-->', alternates)
    .replace(LANG_SWITCH, sw.head).replace(LANG_SWITCH_MENU, sw.menu).replace(LANG_SWITCH_FOOT, sw.foot);
}

module.exports = { page, icon, logo };
