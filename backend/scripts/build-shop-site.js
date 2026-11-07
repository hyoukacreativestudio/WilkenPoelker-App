#!/usr/bin/env node
// Builds the static product pages for the website (wilpo.net) from the public
// shop API: an overview with filters + one page per product, pictures included.
//
//   node scripts/build-shop-site.js --api https://api.wilkenpoelker.de --out <folder> [--root ../] [--test]
//          [--redirect-old] [--sitemap <sitemap.xml> --url https://wilpo.net/produkte/]
//
// Live on wilpo.net since 2026-11-06: --out <website>/produkte --root ../ (same
// products, prices and category order as the app's Produkte tab).
// --test marks every page "noindex" (test area that search engines must not list).
// --redirect-old turns the older pages in the output folder (scraped from
// wilkenpoelker.de, no prices) into forwards to the matching new page.
// --sitemap replaces the product entries of the website's sitemap.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const API = String(arg('api', 'http://localhost:5002')).replace(/\/$/, '');
const OUT = path.resolve(arg('out', 'shop-site'));
const TEST = args.includes('--test');
const ROOT = arg('root', '../../'); // path from the output folder to the website root
const IMG_DIR = 'bilder'; // own folder, the old scraped pictures stay in img/
const PHONE = '+4949525304';
const PHONE_LABEL = '04952 5304';
const MAIL = 'info@wilkenpoelker.de';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const euro = (v) => (v == null ? '' : `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

// Stays below the API rate limit (200 requests/minute) and waits if it hits it.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  for (let attempt = 0; ; attempt += 1) {
    await sleep(350);
    const res = await fetch(url);
    if (res.status === 429 && attempt < 5) { await sleep(30000); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return (await res.json()).data;
  }
}

// Large pictures are scaled to 1000 px for the website (webspace + load time).
async function saveImage(url, file, maxSize) {
  if (fs.existsSync(file)) return;
  const res = await fetch(url.startsWith('http') ? url : `${API}${url}`);
  if (!res.ok) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let buf = Buffer.from(await res.arrayBuffer());
  if (maxSize) {
    buf = await require('sharp')(buf).resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 76 }).toBuffer();
  }
  fs.writeFileSync(file, buf);
}

function head(title, description, depth) {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${TEST ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="theme-color" content="#1c3150">
<link rel="icon" href="${up}${ROOT}favicon.ico" sizes="any">
<link rel="stylesheet" href="${up}${ROOT}styles.css">
<link rel="stylesheet" href="${up}shop.css">
</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
${siteHeader(`${up}${ROOT}`)}
${TEST ? '<div class="shop-testbar">Testseite – Produkte und Preise direkt aus dem Warenwirtschaftssystem (noch nicht öffentlich verlinkt)</div>\n' : ''}<main id="main">`;
}

function foot(depth) {
  const up = depth ? '../' : '';
  return `</main>
${siteFooter(`${up}${ROOT}`)}
<script src="${up}${ROOT}site.js"></script>
</body>
</html>`;
}

// Header and footer exactly as on the other pages of the website
// (same markup as _werkzeuge/apply_design.py of the website folder).
const NAV = [['produkte/index.html', 'Produkte'], ['fahrraeder.html', 'Fahrräder'], ['service.html', 'Service'],
  ['ueber-uns.html', 'Über uns'], ['app.html', 'App'], ['index.html#kontakt', 'Kontakt']];
const SEITEN = [['produkte/index.html', 'Produkte'], ['sortiment.html', 'Sortiment im Überblick'], ['service.html', 'Service &amp; Werkstatt'],
  ['fahrraeder.html', 'Fahrräder &amp; E-Bikes'], ['service.html#leasing', 'E-Bike-Leasing'], ['ueber-uns.html', 'Über uns'],
  ['ueber-uns.html#karriere', 'Karriere'], ['app.html', 'App']];
function siteHeader(r) {
  const links = NAV.map(([h, t]) => `\n      <a href="${r}${h}"${t === 'Produkte' ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<header class="site" id="site">
  <div class="wrap">
    <a href="${r}index.html" class="brand" aria-label="Wilken Poelker, zur Startseite"><img class="logo-main" src="${r}img/logo.png" alt="Wilken Poelker" width="520" height="93"></a>
    <nav class="main" aria-label="Hauptnavigation">${links}
    </nav>
    <a class="head-tel" href="tel:${PHONE}">${PHONE_LABEL}</a>
  </div>
</header>`;
}
function siteFooter(r) {
  const links = SEITEN.map(([h, t]) => `\n        <a href="${r}${h}">${t}</a>`).join('');
  return `<footer class="site-foot">
  <div class="wrap">
    <div class="cols">
      <div class="foot-intro">
        <img class="foot-logo" src="${r}img/logo.png" alt="Wilken Poelker" width="520" height="93" loading="lazy">
        <p>Familienbetrieb seit 1951: E-Bikes und Fahrräder, Motor- und Gartengeräte, Reinigungstechnik und eigene Werkstatt in Ostrhauderfehn.</p>
      </div>
      <div class="navcol">
        <h4>Seiten</h4>${links}
      </div>
      <div class="navcol">
        <h4>Kontakt</h4>
        <p class="foot-addr">Langholter Straße 43<br>26842 Ostrhauderfehn</p>
        <a href="tel:${PHONE}">${PHONE_LABEL}</a>
        <a href="mailto:${MAIL}">${MAIL}</a>
      </div>
    </div>
    <div class="legal">
      <span>© <span id="year">${new Date().getFullYear()}</span> Wilken Poelker GmbH &amp; Co. KG</span>
      <span>Alle Preise inkl. MwSt., Stand ${new Date().toLocaleDateString('de-DE')}</span>
      <a href="${r}impressum.html" class="push">Impressum</a>
      <a href="${r}datenschutz.html">Datenschutz</a>
    </div>
  </div>
</footer>`;
}

function priceHtml(p) {
  if (p.price == null) return '<span class="pask">Preis auf Anfrage</span>';
  const from = p.variantCount > 1 ? 'ab ' : '';
  return `<span class="sprice${p.isOffer ? ' offer' : ''}">${from}${euro(p.price)}</span>${p.isOffer && p.uvp ? `<span class="suvp">UVP ${euro(p.uvp)}</span>` : ''}`;
}

function card(p, imgFile) {
  const data = {
    q: [p.title, p.brand, p.category, p.device, p.main].join(' ').toLowerCase(),
    main: p.main || '', cat: p.device || p.category || '', brand: p.brand || '', drive: p.drive || '', sys: p.batterySystem || '',
    price: p.price ?? '', avail: p.available ? 1 : 0, offer: p.isOffer ? 1 : 0, discount: p.discountPercent || 0, title: p.title,
  };
  const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<a class="pcard" href="p/${esc(p.slug)}.html" ${attrs}>
  <span class="pimg">${imgFile ? `<img src="${esc(imgFile)}" alt="${esc(p.title)}" loading="lazy" width="420" height="420">` : '<span class="noimg">Bild folgt</span>'}${p.isOffer ? `<span class="sbadge">${p.discountPercent ? `${p.discountUpTo ? 'bis ' : ''}-${p.discountPercent} %` : 'Angebot'}</span>` : ''}</span>
  <span class="pbody"><span class="pbrand">${esc(p.brand || '')}</span><span class="pname">${esc(p.title)}</span>
  ${priceHtml(p)}<span class="savail ${p.available ? 'yes' : 'no'}">${p.available ? 'Im Laden verfügbar' : 'Nicht vorrätig'}</span></span>
</a>`;
}

const LIST_JS = `
(function () {
  var cards = [].slice.call(document.querySelectorAll('.pgrid .pcard'));
  var q = document.getElementById('sq'), sort = document.getElementById('ssort');
  var minP = document.getElementById('smin'), maxP = document.getElementById('smax');
  var count = document.getElementById('scount');
  var home = document.getElementById('shome'), layout = document.querySelector('.shop-layout');
  var order = JSON.parse(document.getElementById('sorder').textContent);
  // Same order as the app: Kategorie -> Gerät -> Antrieb -> Akku-System -> Hersteller
  var groups = [['main', 'Kategorie'], ['cat', 'Gerät'], ['drive', 'Antrieb'], ['sys', 'Akku-System'], ['brand', 'Hersteller']];
  var labels = { drive: { akku: 'Akku', benzin: 'Benzin', elektro: 'Elektro', diesel: 'Diesel', manuell: 'Ohne Motor' }, sys: {} };
  var sel = {}; groups.forEach(function (g) { sel[g[0]] = []; });
  var flags = { avail: false, offer: false };
  var showAll = false;
  function filtered() {
    if (q.value.trim() || minP.value || maxP.value || flags.avail || flags.offer) return true;
    for (var k in sel) if (sel[k].length) return true;
    return false;
  }
  function match(c, skip) {
    var words = q.value.toLowerCase().split(/\\s+/).filter(Boolean);
    for (var i = 0; i < words.length; i++) if (c.dataset.q.indexOf(words[i]) < 0) return false;
    for (var k in sel) if (k !== skip && sel[k].length && sel[k].indexOf(c.dataset[k]) < 0) return false;
    if (flags.avail && c.dataset.avail !== '1') return false;
    if (flags.offer && c.dataset.offer !== '1') return false;
    var p = parseFloat(c.dataset.price);
    if (minP.value && !(p >= +minP.value)) return false;
    if (maxP.value && !(p <= +maxP.value)) return false;
    return true;
  }
  function renderFacets() {
    groups.forEach(function (g) {
      var box = document.getElementById('f-' + g[0]); if (!box) return;
      // Gerät only once a Kategorie is chosen, Akku-System only for Akku - like the app
      if ((g[0] === 'cat' && !sel.main.length) || (g[0] === 'sys' && sel.drive.indexOf('akku') < 0 && !sel.sys.length)) { box.parentNode.style.display = 'none'; return; }
      var counts = {};
      cards.forEach(function (c) { if (match(c, g[0])) { var v = c.dataset[g[0]]; if (v) counts[v] = (counts[v] || 0) + 1; } });
      var keys = Object.keys(counts).concat(sel[g[0]].filter(function (v) { return !(v in counts); }));
      keys.sort(function (a, b) {
        if (g[0] === 'main') return order.indexOf(a) - order.indexOf(b);
        return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, 'de');
      });
      box.innerHTML = keys.map(function (v) {
        var on = sel[g[0]].indexOf(v) >= 0;
        var label = (labels[g[0]] && labels[g[0]][v]) || (g[0] === 'sys' ? v + '-System' : v);
        return '<button type="button" class="schip' + (on ? ' on' : '') + '" data-g="' + g[0] + '" data-v="' + v.replace(/"/g, '&quot;') + '">' + label + ' <small>' + (counts[v] || 0) + '</small></button>';
      }).join('');
      box.parentNode.style.display = keys.length ? '' : 'none';
    });
  }
  function apply() {
    // Start page: the categories first, like the app's Produkte tab
    var isHome = !showAll && !filtered();
    home.style.display = isHome ? '' : 'none';
    layout.style.display = isHome ? 'none' : '';
    if (isHome) return;
    var shown = cards.filter(function (c) { var ok = match(c); c.style.display = ok ? '' : 'none'; return ok; });
    var s = sort.value, grid = cards[0] && cards[0].parentNode;
    var sorted = cards.slice().sort(function (a, b) {
      var pa = parseFloat(a.dataset.price), pb = parseFloat(b.dataset.price);
      if (s === 'price_asc') return (isNaN(pa) ? 1e9 : pa) - (isNaN(pb) ? 1e9 : pb);
      if (s === 'price_desc') return (isNaN(pb) ? -1 : pb) - (isNaN(pa) ? -1 : pa);
      if (s === 'name') return a.dataset.title.localeCompare(b.dataset.title, 'de');
      return (b.dataset.discount - a.dataset.discount) || (b.dataset.avail - a.dataset.avail) || a.dataset.title.localeCompare(b.dataset.title, 'de');
    });
    sorted.forEach(function (c) { grid.appendChild(c); });
    count.textContent = shown.length + ' Produkte' + (sel.main.length === 1 ? ' in ' + sel.main[0] : '');
    document.getElementById('sempty').style.display = shown.length ? 'none' : '';
    renderFacets();
  }
  function reset() {
    for (var k in sel) sel[k] = []; flags.avail = flags.offer = false;
    q.value = minP.value = maxP.value = ''; document.getElementById('savail').checked = document.getElementById('soffer').checked = false;
  }
  function chooseMain(v) {
    reset(); sel.main = [v]; showAll = true;
    try { history.replaceState(null, '', '#kategorie=' + encodeURIComponent(v)); } catch (e) {}
    apply(); window.scrollTo(0, 0);
  }
  document.querySelector('.sfilters').addEventListener('click', function (e) {
    var b = e.target.closest('.schip'); if (!b) return;
    var list = sel[b.dataset.g], i = list.indexOf(b.dataset.v);
    if (i >= 0) list.splice(i, 1); else list.push(b.dataset.v);
    if (b.dataset.g === 'main') sel.cat = []; // other Kategorie: other devices
    if (b.dataset.g === 'drive' && sel.drive.indexOf('akku') < 0) sel.sys = [];
    showAll = true; apply();
  });
  home.addEventListener('click', function (e) {
    var t = e.target.closest('[data-main]'); if (t) { e.preventDefault(); chooseMain(t.getAttribute('data-main')); return; }
    if (e.target.closest('#sall')) { e.preventDefault(); reset(); showAll = true; try { history.replaceState(null, '', '#alle'); } catch (x) {} apply(); }
  });
  document.getElementById('shomelink').addEventListener('click', function (e) {
    e.preventDefault(); reset(); showAll = false;
    try { history.replaceState(null, '', location.pathname); } catch (x) {}
    apply(); window.scrollTo(0, 0);
  });
  ['savail', 'soffer'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', function (e) { flags[id === 'savail' ? 'avail' : 'offer'] = e.target.checked; showAll = true; apply(); });
  });
  [q, minP, maxP].forEach(function (el) { el.addEventListener('input', function () { showAll = true; apply(); }); });
  sort.addEventListener('change', apply);
  document.getElementById('sreset').addEventListener('click', function () { reset(); showAll = true; apply(); });
  document.getElementById('stoggle').addEventListener('click', function () { document.querySelector('.sfilters').classList.toggle('open'); });
  // Search on the start page jumps into the list
  document.getElementById('sq0').addEventListener('input', function (e) { q.value = e.target.value; e.target.value = ''; showAll = true; apply(); q.focus(); });
  // Links like produkte/index.html#kategorie=Reinigen open one category
  function fromHash() {
    var m = /kategorie=([^&]+)/.exec(location.hash);
    reset();
    if (m) { sel.main = [decodeURIComponent(m[1])]; showAll = true; }
    else showAll = /alle/.test(location.hash);
    apply();
  }
  window.addEventListener('hashchange', function () { fromHash(); window.scrollTo(0, 0); });
  fromHash();
})();`;

const DETAIL_JS = `
(function () {
  var data = JSON.parse(document.getElementById('pdata').textContent);
  var sel = document.getElementById('pvariant');
  function euro(v) { return v == null ? '' : v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function show(i) {
    var v = data.variants[i];
    document.getElementById('pprice').innerHTML = v.price == null ? 'Preis auf Anfrage'
      : (v.isOffer ? '<span class="sprice offer">Unser Preis ' + euro(v.price) + '</span>' : '<span class="sprice">' + euro(v.price) + '</span>')
        + (v.isOffer && v.uvp ? '<span class="suvp">UVP ' + euro(v.uvp) + '</span>' : '') + '<small>inkl. MwSt.</small>';
    var a = document.getElementById('pavail');
    a.className = 'savail big ' + (v.available ? 'yes' : 'no');
    a.textContent = v.available ? 'Bei uns im Laden verfügbar' : 'Derzeit nicht vorrätig – wir bestellen gern für Sie';
    document.getElementById('partnr').textContent = 'Art.-Nr. ' + v.artNr;
    var subj = 'Anfrage: ' + data.title + ' (Art.-Nr. ' + v.artNr + ')';
    document.getElementById('pmail').href = 'mailto:${MAIL}?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent('Guten Tag,\\n\\nich interessiere mich für ' + data.title + ' (Art.-Nr. ' + v.artNr + ').\\n\\nName:\\nTelefon:\\n\\nMit freundlichen Grüßen');
    var rows = (v.specs || []).map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
    var notes = (v.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
    document.getElementById('pspecs').innerHTML = rows || notes ? '<h3>Ausstattung</h3>' + (rows ? '<dl>' + rows + '</dl>' : '') + (notes ? '<ul class="snotes">' + notes + '</ul>' : '') : '';
  }
  function pick(b) {
    document.getElementById('pmain').src = b.getAttribute('data-src');
    document.querySelectorAll('.pthumb').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
  }
  // Another frame shape / colour: show its own pictures, then the general ones
  var lastLook;
  function pictures(look) {
    if (look === lastLook) return;
    lastLook = look;
    var box = document.querySelector('.pd-thumbs');
    if (!box) return;
    var all = [].slice.call(box.querySelectorAll('.pthumb'));
    var lk = function (b) { return b.getAttribute('data-look') || ''; };
    var own = look ? all.filter(function (b) { return lk(b) === look; }) : [];
    var list = own.length ? own.concat(all.filter(function (b) { return !lk(b); })) : all;
    all.forEach(function (b) { b.style.display = list.indexOf(b) < 0 ? 'none' : ''; });
    list.forEach(function (b) { box.appendChild(b); });
    box.style.display = list.length > 1 ? '' : 'none';
    if (list[0]) pick(list[0]);
  }
  function choose(i) { show(i); pictures(data.variants[i].look || ''); }
  if (sel) sel.addEventListener('change', function () { choose(+sel.value); });
  document.querySelectorAll('.pthumb').forEach(function (b) {
    b.addEventListener('click', function () { pick(b); });
  });
  choose(data.start);
})();`;

const CSS = `
.shop-testbar{background:#fff3cd;color:#6b4e00;text-align:center;font-weight:600;font-size:15px;padding:8px 16px}
.shop-layout{display:grid;grid-template-columns:250px minmax(0,1fr);gap:clamp(28px,4vw,52px);align-items:start}
.sfilters{position:sticky;top:96px;max-height:calc(100vh - 116px);overflow:auto;padding-right:8px}
.sfilters h4{margin:22px 0 8px;font-family:var(--display);font-size:18px;font-weight:600;color:var(--blue)}
.sfilters h4:first-child{margin-top:0}
.sfilters input[type=search],.sfilters input[type=number],.ssort{width:100%;padding:9px 10px;border:1px solid #aab1a8;border-radius:0;font:inherit;font-size:16px;background:#fff;color:var(--ink)}
.sprices{display:flex;gap:8px;align-items:center}
.schips{display:flex;flex-direction:column;align-items:flex-start;gap:0}
.schip{border:0;background:none;padding:4px 0;font:inherit;font-size:16px;text-align:left;cursor:pointer;color:var(--soft)}
.schip small{font-size:14px;color:var(--muted);margin-left:2px}
.schip:hover{color:var(--blue)}
.schip.on{color:var(--blue);font-weight:700;text-decoration:underline;text-decoration-color:var(--green);text-decoration-thickness:3px;text-underline-offset:4px}
.scheck{display:flex;gap:9px;align-items:center;margin:5px 0;font-size:16px;cursor:pointer}
.scheck input{width:18px;height:18px;accent-color:var(--green-text)}
.sbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:22px;flex-wrap:wrap}
.sbar .ssort{width:auto}
#stoggle{display:none}
.noimg{display:grid;place-items:center;aspect-ratio:1;background:var(--stone);color:var(--muted);font-size:15px}
.sbadge{position:absolute;top:0;left:6px;background:var(--green);color:var(--blue);font-weight:700;font-size:13.5px;padding:3px 10px;transform:skewX(var(--slant))}
.sprice{display:block;font-family:var(--display);font-size:21px;font-weight:600;color:var(--blue);margin-top:6px}
.sprice.offer{color:var(--offer)}
.suvp{display:block;font-size:14.5px;color:var(--muted);text-decoration:line-through}
.savail{display:block;font-size:15px;margin-top:4px}
.savail.yes{color:var(--green-text)}
.savail.no{color:var(--muted)}
.savail.big{font-size:18px;font-weight:600;margin:10px 0 0}
.pd-price{margin:18px 0 4px}
.pd-price .sprice{font-size:38px;line-height:1.1}
.pd-price small{display:block;color:var(--muted);font-size:15px}
.pvariant{margin:16px 0 0}
.pvariant select{display:block;width:100%;margin-top:4px;padding:11px;border:1px solid #aab1a8;border-radius:0;font:inherit;background:#fff;color:var(--ink)}
.snotes{margin:12px 0 0;padding-left:18px;color:var(--soft)}
.source{font-size:14.5px;color:var(--muted);margin-top:10px}
.ssearch0{max-width:560px;margin:0 0 30px}
.ssearch0 input{width:100%;padding:12px 14px;border:1px solid #aab1a8;border-radius:0;font:inherit;font-size:17px;background:#fff;color:var(--ink)}
.stiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:34px clamp(18px,2.4vw,32px)}
.stile{display:block;color:var(--ink);text-decoration:none}
.stile .pimg{display:block;aspect-ratio:1;background:var(--stone)}
.stile .pimg img{width:100%;height:100%;object-fit:contain}
.stile b{display:block;margin-top:12px;font-family:var(--display);font-size:22px;font-weight:600;color:var(--blue)}
.stile small{display:block;font-size:15px;color:var(--muted)}
.stile:hover b{text-decoration:underline;text-decoration-color:var(--green);text-decoration-thickness:3px;text-underline-offset:4px}
.sallrow{margin-top:40px}
#shomelink{font-size:16px}
@media(max-width:900px){.shop-layout{grid-template-columns:minmax(0,1fr)}.sfilters{position:static;display:none;max-height:none}.sfilters.open{display:block}#stoggle{display:inline-flex}}
`;

function specsDl(rows) {
  return `<dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

async function main() {
  console.log(`API ${API} -> ${OUT}${TEST ? ' (Testseite, noindex)' : ''}`);
  const list = await getJson(`${API}/api/shop/products?limit=500&sort=name`);
  let items = list.items;
  for (let page = 2; items.length < list.total; page += 1) {
    items = items.concat((await getJson(`${API}/api/shop/products?limit=500&sort=name&page=${page}`)).items);
  }
  fs.mkdirSync(path.join(OUT, 'p'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'shop.css'), CSS.trim() + '\n');

  const cards = [];
  const tileImage = new Map(); // Kategorie -> picture of an available product
  for (const [n, item] of items.entries()) {
    const p = (await getJson(`${API}/api/shop/products/${encodeURIComponent(item.slug)}`)).product;
    const imgs = [];
    for (const [i, img] of (p.images || []).entries()) {
      const big = `${IMG_DIR}/${p.slug}/${i + 1}.webp`;
      const small = `${IMG_DIR}/${p.slug}/${i + 1}-k.webp`;
      await saveImage(img.url, path.join(OUT, big), 1000);
      await saveImage(img.thumb || img.url, path.join(OUT, small));
      imgs.push({ big, small, look: img.look || '' });
    }
    cards.push(card(item, imgs[0]?.small || null));
    if (imgs[0] && item.main && (!tileImage.has(item.main) || (item.available && !tileImage.get(item.main).available))) {
      tileImage.set(item.main, { src: imgs[0].small, available: item.available });
    }

    const vs = p.variants || [];
    const start = Math.max(0, vs.findIndex((v) => v.available));
    const desc = `${p.title} bei Wilken Poelker in Ostrhauderfehn – Preis, Verfügbarkeit und technische Daten.`;
    const html = `${head(`${p.title} – Wilken Poelker`, desc, 1)}
<section class="section pdetail"><div class="wrap">
  <div class="crumb dark"><a href="${ROOT}../index.html">Start</a> / <a href="../index.html">Produkte</a>${p.group ? ` / ${esc(p.group)}` : ''}</div>
  <div class="pd-grid">
    <div class="pd-gallery">
      <div class="pd-main">${imgs[0] ? `<img id="pmain" src="../${esc(imgs[0].big)}" alt="${esc(p.title)}" width="900" height="900">` : '<span class="noimg">Bild folgt</span>'}</div>
      ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<button type="button" class="pthumb${i ? '' : ' on'}" data-src="../${esc(im.big)}"${im.look ? ` data-look="${esc(im.look)}"` : ''} aria-label="Bild ${i + 1}"><img src="../${esc(im.small)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
    </div>
    <div class="pd-info">
      <div class="pbrand big">${esc(p.brand || '')}</div>
      <h1>${esc(p.title)}</h1>
      <p class="pd-sub">${esc([p.category, p.group].filter(Boolean).join(', '))}</p>
      ${vs.length > 1 ? `<div class="pvariant"><label for="pvariant"><b>Ausführung</b></label><select id="pvariant">${vs.map((v, i) => `<option value="${i}"${i === start ? ' selected' : ''}>${esc(v.label || v.artNr)}${v.price != null ? ` – ${euro(v.price)}` : ''}</option>`).join('')}</select></div>` : ''}
      <div class="pd-price" id="pprice"></div>
      <div id="pavail" class="savail big"></div>
      <p class="pd-ids" id="partnr"></p>
      <div class="askbox tall">
        <div><b>Fragen oder reservieren?</b><span>Wir beraten Sie gern – am Telefon, per E-Mail oder bei uns im Geschäft in Ostrhauderfehn.</span></div>
        <div class="btns"><a class="btn dark" href="tel:${PHONE}">${PHONE_LABEL}</a><a class="btn ghost" id="pmail" href="mailto:${MAIL}">Anfrage per E-Mail</a></div>
      </div>
    </div>
  </div>
</div></section>
<section class="section paper2"><div class="wrap">
  <div class="pd-cols">
    <div class="pd-specs"><div class="spec" id="pspecs"></div></div>
    ${p.officialSpecs?.length ? `<div class="pd-specs"><div class="spec"><h3>Technische Daten des Herstellers</h3>${specsDl(p.officialSpecs)}<p class="source">Quelle: ${esc(p.officialSource || '')}</p></div></div>` : ''}
  </div>
  <p class="note">Alle Angaben ohne Gewähr, Änderungen und Irrtümer vorbehalten. Abbildungen können vom Original abweichen.</p>
</div></section>
<script type="application/json" id="pdata">${JSON.stringify({ title: p.title, start, variants: vs.map((v) => ({ artNr: v.artNr, look: v.look || '', price: v.price, uvp: v.uvp, isOffer: v.isOffer, available: v.available, specs: v.specs, notes: v.notes })) }).replace(/</g, '\\u003c')}</script>
<script>${DETAIL_JS}</script>
${foot(1)}`;
    fs.writeFileSync(path.join(OUT, 'p', `${p.slug}.html`), html);
    if ((n + 1) % 50 === 0) console.log(`  ${n + 1}/${items.length}`);
  }

  // Categories in the app's order with their counts (facets of the same API)
  const mains = (list.facets?.main || []).filter((m) => m.count > 0);
  const tiles = mains.map((m) => {
    const img = tileImage.get(m.value);
    return `<a class="stile" href="#kategorie=${encodeURIComponent(m.value)}" data-main="${esc(m.value)}"><span class="pimg">${img ? `<img src="${esc(img.src)}" alt="" loading="lazy" width="420" height="420">` : ''}</span><b>${esc(m.label)}</b><small>${m.count} Produkte</small></a>`;
  }).join('\n');

  const index = `${head('Produkte – Wilken Poelker, Ostrhauderfehn', 'Motorgeräte, Akku-Geräte, Fahrräder und mehr bei Wilken Poelker – mit Preis und Verfügbarkeit in unserem Geschäft.', 0)}
<section class="page-hero slim"><div class="wrap">
  <div class="crumb"><a href="${ROOT}index.html">Start</a> / Produkte</div>
  <h1>Unsere Produkte</h1>
  <p>${items.length} Produkte mit aktuellem Preis und Verfügbarkeit in unserem Geschäft. Wir verschicken nichts – Beratung, Abholung und Lieferung in der Region machen wir persönlich.</p>
</div></section>
<section class="section" id="shome"><div class="wrap">
  <div class="ssearch0"><input type="search" id="sq0" placeholder="Produkt suchen: Name, Hersteller, Modell …" aria-label="Produkt suchen"></div>
  <h2>Kategorien</h2>
  <div class="stiles">
${tiles}
  </div>
  <p class="sallrow"><a class="btn dark" id="sall" href="#alle">Alle ${items.length} Produkte ansehen</a></p>
</div></section>
<section class="section"><div class="wrap shop-layout" style="display:none">
  <aside class="sfilters" aria-label="Filter">
    <h4>Suche</h4><input type="search" id="sq" placeholder="Name, Hersteller, Modell …">
    <h4>Anzeigen</h4>
    <label class="scheck"><input type="checkbox" id="savail"> Nur verfügbare</label>
    <label class="scheck"><input type="checkbox" id="soffer"> Nur Angebote</label>
    <div><h4>Kategorie</h4><div class="schips" id="f-main"></div></div>
    <div><h4>Gerät</h4><div class="schips" id="f-cat"></div></div>
    <div><h4>Antrieb</h4><div class="schips" id="f-drive"></div></div>
    <div><h4>Akku-System</h4><div class="schips" id="f-sys"></div></div>
    <div><h4>Hersteller</h4><div class="schips" id="f-brand"></div></div>
    <h4>Preis (€)</h4><div class="sprices"><input type="number" id="smin" placeholder="von" min="0"><span>–</span><input type="number" id="smax" placeholder="bis" min="0"></div>
    <p style="margin-top:16px"><button type="button" class="btn ghost" id="sreset">Filter zurücksetzen</button></p>
  </aside>
  <div>
    <p><a href="index.html" id="shomelink">‹ Alle Kategorien</a></p>
    <div class="sbar">
      <b id="scount"></b>
      <span><button type="button" class="btn ghost" id="stoggle">Filter</button>
      <select class="ssort" id="ssort" aria-label="Sortierung"><option value="relevance">Empfohlen</option><option value="price_asc">Preis aufsteigend</option><option value="price_desc">Preis absteigend</option><option value="name">Name A–Z</option></select></span>
    </div>
    <div class="pgrid">
${cards.join('\n')}
    </div>
    <p id="sempty" style="display:none">Keine passenden Produkte. Gern beraten wir Sie persönlich unter <a href="tel:${PHONE}">${PHONE_LABEL}</a>.</p>
  </div>
</div></section>
<script type="application/json" id="sorder">${JSON.stringify(mains.map((m) => m.value)).replace(/</g, '\\u003c')}</script>
<script>${LIST_JS}</script>
${foot(0)}`;
  fs.writeFileSync(path.join(OUT, 'index.html'), index);
  console.log(`fertig: ${items.length} Produkte`);

  retireProductPages(items);
  if (args.includes('--redirect-old')) redirectOldPages(items);
  if (arg('sitemap')) updateSitemap(arg('sitemap'), arg('url', 'https://wilpo.net/produkte/'), items);
}

// ── Older pages (scraped from wilkenpoelker.de, no prices) ────────────────
// Their addresses may be bookmarked or listed by Google: each one becomes a
// forward to the same product in the new catalog, a category page to the
// matching category, everything else to the overview. Nothing is deleted.
const OLD_CATEGORY = {
  'akkus-und-ladegeraete': 'Zubehör', 'automatische-bewaesserung': 'Hecke & Garten', erdbohrer: 'Bau & Werkstatt',
  'fahrbare-laubsauger-blaeser': 'Laub, Kehren & Winter', frontmaeher: 'Rasen & Wiese', 'gras-strauch-und-heckenscheren': 'Hecke & Garten',
  haecksler: 'Hecke & Garten', 'handgefuehrte-kehrmaschinen': 'Laub, Kehren & Winter', 'haushalts-gewerbereiniger': 'Reinigen',
  hochdruckreiniger: 'Reinigen', hochentaster: 'Sägen & Holz', 'hochgras-rasenmaeher': 'Rasen & Wiese', kehrsaugmaschinen: 'Reinigen',
  'kombi-systeme': 'Hecke & Garten', maehroboter: 'Rasen & Wiese', 'mechanische-wildkrautentfernung': 'Laub, Kehren & Winter',
  motorhacken: 'Hecke & Garten', motorsaegen: 'Sägen & Holz', 'motorsensen-freischneider': 'Rasen & Wiese', 'nass-trockensauger': 'Reinigen',
  nullwendekreismaeher: 'Rasen & Wiese', pumpen: 'Bau & Werkstatt', rasenmaeher: 'Rasen & Wiese', 'rasentraktor-anbaugeraete': 'Rasen & Wiese',
  rasentraktoren: 'Rasen & Wiese', rasentrimmer: 'Rasen & Wiese', reiniger: 'Reinigen', scheuersaugmaschinen: 'Reinigen',
  'schlaeuche-und-schlauchaufbewahrungen': 'Zubehör', 'sonstige-schutzausruestung': 'Zubehör', 'spritzen-spruehgeraete': 'Hecke & Garten',
  'tragbare-laubsauger-blaeser': 'Laub, Kehren & Winter', 'vertikutierer-rasenluefter-aerifizierer': 'Rasen & Wiese',
};
const tokens = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Same product = every word of the new address (brand + model) is in the old one,
// e.g. stihl-ms-162-422692 -> stihl-ms-162. The longest such address wins.
function findNewPage(oldBase, items) {
  const old = new Set(tokens(oldBase));
  let best = null;
  for (const it of items) {
    const t = tokens(it.slug);
    if (t.length < 2 || !t.some((w) => /\d/.test(w))) continue; // needs a model number
    if (t.every((w) => old.has(w)) && (!best || t.length > tokens(best.slug).length)) best = it;
  }
  return best;
}

function forwardPage(target, title) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} – Wilken Poelker</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${esc(target)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<p>Diese Seite ist umgezogen: <a href="${esc(target)}">${esc(title)} im aktuellen Sortiment</a>.</p>
</body>
</html>
`;
}

// Product pages from earlier runs whose product is no longer shown (sold out
// discontinued model, accessory group, hidden in the PC tool): they would keep
// old prices online, so each becomes a forward to the overview. Nothing is deleted.
function retireProductPages(items) {
  const live = new Set(items.map((it) => `${it.slug}.html`));
  let n = 0;
  for (const file of fs.readdirSync(path.join(OUT, 'p'))) {
    if (!file.endsWith('.html') || live.has(file)) continue;
    const full = path.join(OUT, 'p', file);
    const old = fs.readFileSync(full, 'utf8');
    if (old.includes('http-equiv="refresh"')) continue; // already a forward
    const title = (old.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1]?.trim() || 'Produkte';
    fs.writeFileSync(full, forwardPage('../index.html', title));
    n += 1;
  }
  if (n) console.log(`${n} nicht mehr gezeigte Produktseiten leiten jetzt zur Übersicht`);
}

function redirectOldPages(items) {
  const counts = { product: 0, category: 0, overview: 0 };
  for (const file of fs.readdirSync(OUT)) {
    if (!file.endsWith('.html') || file === 'index.html') continue;
    const base = file.replace(/\.html$/, '');
    const full = path.join(OUT, file);
    const old = fs.readFileSync(full, 'utf8');
    const title = (old.match(/<h1[^>]*>([^<]*)<\/h1>/) || old.match(/<title>([^<–-]*)/) || [])[1]?.trim() || 'Produkte';
    let target = 'index.html';
    const cat = OLD_CATEGORY[base] || (base.startsWith('zubehoer-') ? 'Zubehör' : null);
    const hit = cat ? null : findNewPage(base.replace(/-\d+$/, ''), items);
    if (hit) { target = `p/${hit.slug}.html`; counts.product += 1; } else if (cat) { target = `index.html#kategorie=${encodeURIComponent(cat)}`; counts.category += 1; } else counts.overview += 1;
    fs.writeFileSync(full, forwardPage(target, title));
  }
  console.log(`alte Seiten umgeleitet: ${counts.product} auf Produkte, ${counts.category} auf Kategorien, ${counts.overview} auf die Übersicht`);
}

// Sitemap: the product entries are replaced, all other pages stay.
function updateSitemap(file, url, items) {
  const base = url.endsWith('/') ? url : `${url}/`;
  const today = new Date().toISOString().slice(0, 10);
  const s = fs.readFileSync(file, 'utf8');
  const others = (s.match(/<url>[\s\S]*?<\/url>/g) || []).filter((u) => !u.includes('/produkte/'));
  const prod = [`${base}index.html`, ...items.map((it) => `${base}p/${it.slug}.html`)]
    .map((loc) => `<url><loc>${esc(loc)}</loc><lastmod>${today}</lastmod></url>`);
  const out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...others, ...prod].map((u) => `  ${u}`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(file, out);
  console.log(`Sitemap: ${others.length} Seiten + ${prod.length} Produktseiten`);
}

main().catch((e) => { console.error(e); process.exit(1); });
