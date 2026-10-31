#!/usr/bin/env node
// Builds the static product pages for the website (wilpo.net) from the public
// shop API: an overview with filters + one page per product, pictures included.
//
//   node scripts/build-shop-site.js --api https://api.wilkenpoelker.de --out <folder> [--test]
//
// --test marks every page "noindex" (test area that search engines must not list).
// The output uses the website's own styles.css two folders up (/Produkte/test/).
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const API = String(arg('api', 'http://localhost:5002')).replace(/\/$/, '');
const OUT = path.resolve(arg('out', 'shop-site'));
const TEST = args.includes('--test');
const ROOT = arg('root', '../../'); // path from the output folder to the website root
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
${TEST ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="theme-color" content="#0f2916">
<link rel="icon" href="${up}${ROOT}favicon.ico" sizes="any">
<link rel="stylesheet" href="${up}${ROOT}styles.css">
<link rel="stylesheet" href="${up}shop.css">
<script>document.documentElement.className += ' js';</script>
</head>
<body>
<div class="topbar"><div class="wrap">
  <span>📍 Langholter Straße 43, 26842 Ostrhauderfehn</span><span class="dot"></span>
  <a href="tel:${PHONE}">${PHONE_LABEL}</a><span class="dot"></span><a href="mailto:${MAIL}">${MAIL}</a>
  <span class="push">Familienbetrieb seit 1951</span>
</div></div>
<header class="site" id="site"><div class="wrap">
  <a href="${up}${ROOT}index.html" class="brand" aria-label="Wilken Poelker – zur Startseite">
    <img class="logo-main" src="${up}${ROOT}img/logo.png" alt="Wilken Poelker" width="520" height="93">
    <img class="logo-claim" src="${up}${ROOT}img/logo-claim.png" alt="Für jedermann – ob Privat oder Profi" width="340" height="116">
  </a>
  <nav class="main" aria-label="Hauptnavigation">
    <a href="${up}${ROOT}index.html">Start</a>
    <a href="${up}index.html" aria-current="page">Produkte</a>
    <a href="${up}${ROOT}service.html">Service</a>
    <a href="${up}${ROOT}ueber-uns.html">Über uns</a>
    <a href="${up}${ROOT}index.html#kontakt" class="cta">Kontakt</a>
  </nav>
</div></header>
${TEST ? '<div class="shop-testbar">Testseite – Produkte und Preise direkt aus dem Warenwirtschaftssystem (noch nicht öffentlich verlinkt)</div>\n' : ''}<main>`;
}

function foot(depth) {
  const up = depth ? '../' : '';
  return `</main>
<footer class="site-foot"><div class="wrap">
  <div class="legal">
    <span>© ${new Date().getFullYear()} Wilken Poelker GmbH &amp; Co. KG · Alle Preise inkl. MwSt. · Stand ${new Date().toLocaleDateString('de-DE')}</span>
    <a href="${up}${ROOT}impressum.html" class="push">Impressum</a>
    <a href="${up}${ROOT}datenschutz.html">Datenschutz</a>
  </div>
</div></footer>
<script src="${up}${ROOT}site.js"></script>
</body>
</html>`;
}

function priceHtml(p) {
  if (p.price == null) return '<span class="pask">Preis auf Anfrage</span>';
  const from = p.variantCount > 1 ? 'ab ' : '';
  return `<span class="sprice${p.isOffer ? ' offer' : ''}">${from}${euro(p.price)}</span>${p.isOffer && p.uvp ? `<span class="suvp">UVP ${euro(p.uvp)}</span>` : ''}`;
}

function card(p, imgFile) {
  const data = {
    q: [p.title, p.brand, p.category, p.group].join(' ').toLowerCase(),
    whg: p.group || '', cat: p.category || '', brand: p.brand || '', drive: p.drive || '', sys: p.batterySystem || '',
    price: p.price ?? '', avail: p.available ? 1 : 0, offer: p.isOffer ? 1 : 0, title: p.title,
  };
  const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<a class="pcard" href="p/${esc(p.slug)}.html" ${attrs}>
  <span class="pimg">${imgFile ? `<img src="${esc(imgFile)}" alt="${esc(p.title)}" loading="lazy" width="420" height="420">` : '<span class="noimg">Bild folgt</span>'}${p.isOffer ? '<span class="sbadge">Angebot</span>' : ''}</span>
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
  var groups = [['whg', 'Warengruppe'], ['cat', 'Gerät'], ['brand', 'Hersteller'], ['drive', 'Antrieb'], ['sys', 'Akku-System']];
  var labels = { drive: { akku: 'Akku', benzin: 'Benzin', elektro: 'Elektro', diesel: 'Diesel' }, sys: {} };
  var sel = {}; groups.forEach(function (g) { sel[g[0]] = []; });
  var flags = { avail: false, offer: false };
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
      var counts = {};
      cards.forEach(function (c) { if (match(c, g[0])) { var v = c.dataset[g[0]]; if (v) counts[v] = (counts[v] || 0) + 1; } });
      var keys = Object.keys(counts).concat(sel[g[0]].filter(function (v) { return !(v in counts); }));
      keys.sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, 'de'); });
      box.innerHTML = keys.map(function (v) {
        var on = sel[g[0]].indexOf(v) >= 0;
        var label = (labels[g[0]] && labels[g[0]][v]) || (g[0] === 'sys' ? v + '-System' : v);
        return '<button type="button" class="schip' + (on ? ' on' : '') + '" data-g="' + g[0] + '" data-v="' + v.replace(/"/g, '&quot;') + '">' + label + ' <small>' + (counts[v] || 0) + '</small></button>';
      }).join('');
      box.parentNode.style.display = keys.length ? '' : 'none';
    });
  }
  function apply() {
    var shown = cards.filter(function (c) { var ok = match(c); c.style.display = ok ? '' : 'none'; return ok; });
    var s = sort.value, grid = cards[0] && cards[0].parentNode;
    var sorted = cards.slice().sort(function (a, b) {
      var pa = parseFloat(a.dataset.price), pb = parseFloat(b.dataset.price);
      if (s === 'price_asc') return (isNaN(pa) ? 1e9 : pa) - (isNaN(pb) ? 1e9 : pb);
      if (s === 'price_desc') return (isNaN(pb) ? -1 : pb) - (isNaN(pa) ? -1 : pa);
      if (s === 'name') return a.dataset.title.localeCompare(b.dataset.title, 'de');
      return (b.dataset.avail - a.dataset.avail) || a.dataset.title.localeCompare(b.dataset.title, 'de');
    });
    sorted.forEach(function (c) { grid.appendChild(c); });
    count.textContent = shown.length + ' Produkte';
    document.getElementById('sempty').style.display = shown.length ? 'none' : '';
    renderFacets();
  }
  document.querySelector('.sfilters').addEventListener('click', function (e) {
    var b = e.target.closest('.schip'); if (!b) return;
    var list = sel[b.dataset.g], i = list.indexOf(b.dataset.v);
    if (i >= 0) list.splice(i, 1); else list.push(b.dataset.v);
    apply();
  });
  ['savail', 'soffer'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', function (e) { flags[id === 'savail' ? 'avail' : 'offer'] = e.target.checked; apply(); });
  });
  [q, minP, maxP].forEach(function (el) { el.addEventListener('input', apply); });
  sort.addEventListener('change', apply);
  document.getElementById('sreset').addEventListener('click', function () {
    for (var k in sel) sel[k] = []; flags.avail = flags.offer = false;
    q.value = minP.value = maxP.value = ''; document.getElementById('savail').checked = document.getElementById('soffer').checked = false; apply();
  });
  document.getElementById('stoggle').addEventListener('click', function () { document.querySelector('.sfilters').classList.toggle('open'); });
  apply();
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
  if (sel) sel.addEventListener('change', function () { show(+sel.value); });
  show(data.start);
  document.querySelectorAll('.pthumb').forEach(function (b) {
    b.addEventListener('click', function () {
      document.getElementById('pmain').src = b.getAttribute('data-src');
      document.querySelectorAll('.pthumb').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
  });
})();`;

const CSS = `
.shop-testbar{background:#fff3cd;color:#6b4e00;text-align:center;font-weight:700;font-size:14px;padding:8px 16px}
.shop-layout{display:grid;grid-template-columns:270px 1fr;gap:28px;align-items:start}
.sfilters{position:sticky;top:96px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;max-height:calc(100vh - 120px);overflow:auto}
.sfilters h4{margin:16px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--green-dd)}
.sfilters h4:first-child{margin-top:0}
.sfilters input[type=search],.sfilters input[type=number],.ssort{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:#fff}
.sprices{display:flex;gap:8px;align-items:center}
.schips{display:flex;flex-wrap:wrap;gap:6px}
.schip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 11px;font:inherit;font-size:13.5px;cursor:pointer;color:var(--ink)}
.schip small{color:var(--ink-soft)}
.schip.on{background:var(--green);border-color:var(--green);color:#0b2010;font-weight:700}
.scheck{display:flex;gap:8px;align-items:center;margin:6px 0;font-size:15px;cursor:pointer}
.sbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.sbar .ssort{width:auto}
#stoggle{display:none}
.pimg{position:relative}
.noimg{display:grid;place-items:center;aspect-ratio:1;color:var(--ink-soft);font-size:14px}
.sbadge{position:absolute;top:10px;left:10px;background:#c62828;color:#fff;font-weight:800;font-size:12px;padding:3px 9px;border-radius:999px}
.sprice{display:block;font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);margin-top:6px}
.sprice.offer{color:#c62828}
.suvp{display:block;font-size:13px;color:var(--ink-soft);text-decoration:line-through}
.savail{display:block;font-size:13px;font-weight:700;margin-top:6px}
.savail.yes{color:var(--green-dd)}
.savail.no{color:var(--ink-soft)}
.savail.big{font-size:16px;margin:10px 0 0}
.pd-price{margin:18px 0 4px}
.pd-price .sprice{font-size:34px}
.pd-price small{display:block;color:var(--ink-soft);font-size:13px}
.pvariant{margin:14px 0 0}
.pvariant select{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;font:inherit;background:#fff}
.snotes{margin:10px 0 0;padding-left:18px}
.pd-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.pthumb{width:68px;height:68px;border:2px solid var(--line);border-radius:10px;background:#fff;padding:4px;cursor:pointer}
.pthumb.on{border-color:var(--green)}
.pthumb img{width:100%;height:100%;object-fit:contain}
.source{font-size:13px;color:var(--ink-soft);margin-top:8px}
@media(max-width:900px){.shop-layout{grid-template-columns:1fr}.sfilters{position:static;display:none;max-height:none}.sfilters.open{display:block}#stoggle{display:inline-flex}}
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
  for (const [n, item] of items.entries()) {
    const p = (await getJson(`${API}/api/shop/products/${encodeURIComponent(item.slug)}`)).product;
    const imgs = [];
    for (const [i, img] of (p.images || []).entries()) {
      const big = `img/${p.slug}/${i + 1}.webp`;
      const small = `img/${p.slug}/${i + 1}-k.webp`;
      await saveImage(img.url, path.join(OUT, big), 1000);
      await saveImage(img.thumb || img.url, path.join(OUT, small));
      imgs.push({ big, small });
    }
    cards.push(card(item, imgs[0]?.small || null));

    const vs = p.variants || [];
    const start = Math.max(0, vs.findIndex((v) => v.available));
    const desc = `${p.title} bei Wilken Poelker in Ostrhauderfehn – Preis, Verfügbarkeit und technische Daten.`;
    const html = `${head(`${p.title} – Wilken Poelker`, desc, 1)}
<section class="section pdetail"><div class="wrap">
  <div class="crumb dark"><a href="${ROOT}../index.html">Start</a> / <a href="../index.html">Produkte</a>${p.group ? ` / ${esc(p.group)}` : ''}</div>
  <div class="pd-grid">
    <div class="pd-gallery">
      <div class="pd-main">${imgs[0] ? `<img id="pmain" src="../${esc(imgs[0].big)}" alt="${esc(p.title)}" width="900" height="900">` : '<span class="noimg">Bild folgt</span>'}</div>
      ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<button type="button" class="pthumb${i ? '' : ' on'}" data-src="../${esc(im.big)}" aria-label="Bild ${i + 1}"><img src="../${esc(im.small)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
    </div>
    <div class="pd-info">
      <div class="pbrand big">${esc(p.brand || '')}</div>
      <h1>${esc(p.title)}</h1>
      <p class="pd-sub">${esc([p.category, p.group].filter(Boolean).join(' · '))}</p>
      ${vs.length > 1 ? `<div class="pvariant"><label for="pvariant"><b>Ausführung</b></label><select id="pvariant">${vs.map((v, i) => `<option value="${i}"${i === start ? ' selected' : ''}>${esc(v.label || v.artNr)}${v.price != null ? ` – ${euro(v.price)}` : ''}</option>`).join('')}</select></div>` : ''}
      <div class="pd-price" id="pprice"></div>
      <div id="pavail" class="savail big"></div>
      <p class="pd-ids" id="partnr"></p>
      <div class="askbox tall">
        <div><b>Fragen oder reservieren?</b><span>Wir beraten Sie gern – am Telefon, per E-Mail oder bei uns im Geschäft in Ostrhauderfehn.</span></div>
        <div class="btns"><a class="btn dark" href="tel:${PHONE}">📞 ${PHONE_LABEL}</a><a class="btn ghost" id="pmail" href="mailto:${MAIL}">✉️ Anfrage per E-Mail</a></div>
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
<script type="application/json" id="pdata">${JSON.stringify({ title: p.title, start, variants: vs.map((v) => ({ artNr: v.artNr, price: v.price, uvp: v.uvp, isOffer: v.isOffer, available: v.available, specs: v.specs, notes: v.notes })) }).replace(/</g, '\\u003c')}</script>
<script>${DETAIL_JS}</script>
${foot(1)}`;
    fs.writeFileSync(path.join(OUT, 'p', `${p.slug}.html`), html);
    if ((n + 1) % 50 === 0) console.log(`  ${n + 1}/${items.length}`);
  }

  const index = `${head('Produkte – Wilken Poelker, Ostrhauderfehn', 'Motorgeräte, Akku-Geräte und mehr bei Wilken Poelker – mit Preis und Verfügbarkeit.', 0)}
<section class="page-hero slim"><div class="wrap">
  <div class="crumb"><a href="${ROOT}index.html">Start</a> / Produkte</div>
  <h1>Unsere Produkte</h1>
  <p>${items.length} Produkte mit aktuellem Preis und Verfügbarkeit in unserem Geschäft.</p>
</div></section>
<section class="section"><div class="wrap shop-layout">
  <aside class="sfilters" aria-label="Filter">
    <h4>Suche</h4><input type="search" id="sq" placeholder="Name, Hersteller, Modell …">
    <h4>Anzeigen</h4>
    <label class="scheck"><input type="checkbox" id="savail"> Nur verfügbare</label>
    <label class="scheck"><input type="checkbox" id="soffer"> Nur Angebote</label>
    <div><h4>Warengruppe</h4><div class="schips" id="f-whg"></div></div>
    <div><h4>Gerät</h4><div class="schips" id="f-cat"></div></div>
    <div><h4>Hersteller</h4><div class="schips" id="f-brand"></div></div>
    <div><h4>Antrieb</h4><div class="schips" id="f-drive"></div></div>
    <div><h4>Akku-System</h4><div class="schips" id="f-sys"></div></div>
    <h4>Preis (€)</h4><div class="sprices"><input type="number" id="smin" placeholder="von" min="0"><span>–</span><input type="number" id="smax" placeholder="bis" min="0"></div>
    <p style="margin-top:16px"><button type="button" class="btn ghost" id="sreset">Filter zurücksetzen</button></p>
  </aside>
  <div>
    <div class="sbar">
      <b id="scount"></b>
      <span><button type="button" class="btn ghost" id="stoggle">☰ Filter</button>
      <select class="ssort" id="ssort" aria-label="Sortierung"><option value="relevance">Empfohlen</option><option value="price_asc">Preis aufsteigend</option><option value="price_desc">Preis absteigend</option><option value="name">Name A–Z</option></select></span>
    </div>
    <div class="pgrid">
${cards.join('\n')}
    </div>
    <p id="sempty" style="display:none">Keine passenden Produkte. Gern beraten wir Sie persönlich unter <a href="tel:${PHONE}">${PHONE_LABEL}</a>.</p>
  </div>
</div></section>
<script>${LIST_JS}</script>
${foot(0)}`;
  fs.writeFileSync(path.join(OUT, 'index.html'), index);
  console.log(`fertig: ${items.length} Produkte`);
}

main().catch((e) => { console.error(e); process.exit(1); });
