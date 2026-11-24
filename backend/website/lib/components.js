// Building blocks shared by several pages
const { esc, euro, dateDe, dayName } = require('./util');
const { icon } = require('./layout');
const { COMPANY, ADDRESS_LINE, MAPS, txt } = require('./content');
const { L, isEn, mainName, deviceName, holidayName } = require('./i18n');

const time = (t) => String(t || '').replace(/^0(\d)/, '$1');
const hour = (t) => time(t).replace(/:00$/, '');
const periodsText = (periods, sep = L(' und ', ' and ')) => periods.map((p) => `${time(p.open)} ${L('bis', 'to')} ${time(p.close)}`).join(sep);
const SEASONS = {
  de: { standard: 'Februar bis Oktober', winter: 'November bis Januar' },
  en: { standard: 'February to October', winter: 'November to January' },
};
const seasonLabel = (k) => SEASONS[isEn() ? 'en' : 'de'][k];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const uhr = (s) => L(`${s} Uhr`, s);

// ── Prices ────────────────────────────────────────────
// UVP = the manufacturer's non-binding recommended retail price. Our offers are
// prices below it (never a "reduction" of an earlier price of ours), so every
// percentage says what it refers to.
function priceInline(p) {
  if (p.price == null) return `<span class="ask">${L('Preis auf Anfrage', 'Price on request')}</span>`;
  const from = p.variantCount > 1 ? L('ab ', 'from ') : '';
  const uvp = p.isOffer && p.uvp && p.uvp > p.price ? `<span class="uvp">${L('UVP', 'RRP')} ${euro(p.uvp)}</span>` : '';
  return `<span class="price${p.isOffer ? ' offer' : ''}">${from}${euro(p.price)}</span>${uvp}`;
}

function offerTag(p) {
  if (!p.isOffer) return '';
  const upTo = p.discountUpTo ? L('bis ', 'up to ') : '';
  const text = p.discountPercent ? L(`${upTo}${p.discountPercent}&nbsp;% unter UVP`, `${upTo}${p.discountPercent}% below RRP`) : L('Angebot', 'Offer');
  return `<span class="tag"><span>${text}</span></span>`;
}

const availText = (a) => (a ? L('Im Laden verfügbar', 'Available in our shop') : L('Derzeit nicht vorrätig', 'Currently out of stock'));

// Product card. The data attributes feed the filters (catalog.js); on the
// English pages category and device are the English names (shown as chips).
function productCard(p, img, { eager = false } = {}) {
  const data = {
    q: [p.title, p.brand, p.model, p.device, p.main, isEn() ? deviceName(p.device) : '', isEn() ? mainName(p.main) : ''].filter(Boolean).join(' ').toLowerCase(),
    main: p.main ? mainName(p.main) : '', cat: p.device ? deviceName(p.device) : '', brand: p.brand || '', drive: p.drive || '', sys: p.batterySystem || '',
    price: p.price ?? '', avail: p.available ? 1 : 0, offer: p.isOffer ? 1 : 0, discount: p.discountPercent || 0, title: p.title,
  };
  const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  const pic = img
    ? `<img src="${img.small}" alt="${esc(p.title)}" width="${img.sw}" height="${img.sh}"${eager ? '' : ' loading="lazy"'} decoding="async">`
    : `<span class="noimg">${L('Bild folgt', 'Picture coming soon')}</span>`;
  return `<a class="pcard" href="/produkte/p/${esc(p.slug)}.html" ${attrs}><span class="pimg">${offerTag(p)}${pic}</span><span class="pbody"><span class="pbrand">${esc(p.brand || '')}</span><span class="pname">${esc(p.title)}</span><span class="pprice">${priceInline(p)}</span><span class="avail${p.available ? ' yes' : ''}">${availText(p.available)}</span></span></a>`;
}

// ── Pictures ──────────────────────────────────────────
function photoImg(ph, { alt = '', sizes = '100vw', eager = false, cls = '' } = {}) {
  if (!ph) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${ph.src}" srcset="${ph.srcset}" sizes="${sizes}" width="${ph.width}" height="${ph.height}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

// ── Navigation ────────────────────────────────────────
function crumbs(items) {
  return `<nav aria-label="${L('Brotkrümelnavigation', 'Breadcrumb')}"><ol class="crumbs">${items.map(([name, href], i) => (i === items.length - 1
    ? `<li aria-current="page">${esc(name)}</li>`
    : `<li><a href="${href}">${esc(name)}</a></li>`)).join('')}</ol></nav>`;
}

// ── Opening hours ─────────────────────────────────────
function describeWeek(schedule) {
  if (!schedule || !schedule.length) return '';
  const by = new Map(schedule.map((d) => [d.dayOfWeek, d]));
  const sig = (d) => (!d || d.isClosed || !(d.periods || []).length ? 'closed' : periodsText(d.periods));
  const parts = [];
  for (let i = 0; i < ORDER.length;) {
    const key = sig(by.get(ORDER[i]));
    let j = i;
    while (j + 1 < ORDER.length && sig(by.get(ORDER[j + 1])) === key) j += 1;
    const names = i === j ? dayName(ORDER[i]) : `${dayName(ORDER[i])} ${L('bis', 'to')} ${dayName(ORDER[j])}`;
    parts.push(`${names} ${key === 'closed' ? L('geschlossen', 'closed') : uhr(key)}`);
    i = j + 1;
  }
  return parts.join(', ');
}

function seasons(ctx) {
  const cur = ctx.hours.currentSeason && ctx.hours[ctx.hours.currentSeason] ? ctx.hours.currentSeason : (ctx.hours.standard ? 'standard' : 'winter');
  const other = cur === 'standard' ? 'winter' : 'standard';
  return { cur, other, current: ctx.hours[cur] || [], otherSchedule: ctx.hours[other] || null };
}

// One sentence for FAQ answers and descriptions
function hoursText(ctx) {
  const s = seasons(ctx);
  let text = `${describeWeek(s.current)}.`;
  if (s.otherSchedule && describeWeek(s.otherSchedule) !== describeWeek(s.current)) {
    text = s.cur === 'standard'
      ? L(`${describeWeek(s.current)}. Im Winter (${seasonLabel('winter')}): ${describeWeek(s.otherSchedule)}.`,
        `${describeWeek(s.current)}. In winter (${seasonLabel('winter')}): ${describeWeek(s.otherSchedule)}.`)
      : L(`Im Winter (${seasonLabel('winter')}): ${describeWeek(s.current)}. Von ${seasonLabel('standard')}: ${describeWeek(s.otherSchedule)}.`,
        `In winter (${seasonLabel('winter')}): ${describeWeek(s.current)}. From ${seasonLabel('standard')}: ${describeWeek(s.otherSchedule)}.`);
  }
  return `${text} ${L('An gesetzlichen Feiertagen ist geschlossen. Abweichende Öffnungszeiten stehen tagesaktuell auf unserer Kontaktseite und in unserer App.', 'We are closed on public holidays. Any changes to our opening hours are shown, always up to date, on our contact page and in our app.')}`;
}

// The opening hours as bars on a day scale (the same scale everywhere, so the
// bars of the hero sign and of the week line up). site.js marks today and
// moves the "now" line; without JavaScript the bars and times are still there.
const toMin = (t) => { const [h, m] = String(t || '0').split(':'); return (+h || 0) * 60 + (+m || 0); };
function hoursRange(ctx) {
  let min = 24 * 60;
  let max = 0;
  for (const s of [ctx.hours.standard, ctx.hours.winter]) {
    for (const d of s || []) for (const p of d.periods || []) { min = Math.min(min, toMin(p.open)); max = Math.max(max, toMin(p.close)); }
  }
  if (min >= max) { min = 8 * 60; max = 18 * 60; }
  return { start: Math.max(0, Math.floor(min / 60) - 1) * 60, end: Math.min(24, Math.ceil(max / 60) + 1) * 60 };
}
const pct = (v, r) => (Math.round(((v - r.start) / (r.end - r.start)) * 10000) / 100);
function bars(periods, r) {
  return (periods || []).map((p) => {
    const a = Math.max(r.start, toMin(p.open));
    const b = Math.min(r.end, toMin(p.close));
    return b > a ? `<i style="left:${pct(a, r)}%;width:${Math.round((pct(b, r) - pct(a, r)) * 100) / 100}%"></i>` : '';
  }).join('');
}
function hoursScale(r) {
  const ticks = [];
  for (let h = Math.ceil(r.start / 60); h <= r.end / 60; h += 1) if (h % 2 === 0) ticks.push(`<span style="left:${pct(h * 60, r)}%">${h}</span>`);
  return `<span class="hscale" aria-hidden="true">${ticks.join('')}</span>`;
}
const track = (inner, r, attrs = '') => `<span class="track" data-range="${r.start}-${r.end}"${attrs} aria-hidden="true">${inner}<b class="now"></b></span>`;

function weekBlock(ctx, schedule) {
  const r = hoursRange(ctx);
  const by = new Map((schedule || []).map((d) => [d.dayOfWeek, d]));
  const rows = ORDER.map((dow) => {
    const d = by.get(dow);
    const closed = !d || d.isClosed || !(d.periods || []).length;
    const text = closed ? L('geschlossen', 'closed') : (isEn()
      ? d.periods.map((p) => `${time(p.open)}–${time(p.close)}`).join(', ')
      : `${d.periods.map((p) => `${hour(p.open)}–${hour(p.close)}`).join(', ')} Uhr`);
    return `<li data-dow="${dow}"${closed ? ' class="off"' : ''}><span class="wd">${dayName(dow)}</span>${track(closed ? '' : bars(d.periods, r), r)}<span class="wt">${text}</span></li>`;
  }).join('');
  return `<div class="week"><span class="week-scale">${hoursScale(r)}</span><ol class="week-days" aria-label="${L('Öffnungszeiten nach Wochentag', 'Opening hours by day of the week')}">${rows}</ol></div>`;
}

function closedDaysBlock(days) {
  const list = (days || []).slice(0, 8).map((c) => {
    const when = dateDe(`${c.date}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'long' });
    const hours = c.isClosed || !(c.specialHours || []).length ? L('geschlossen', 'closed') : uhr(periodsText(c.specialHours, ', ').replace(/ (bis|to) /g, '–'));
    return `<li><span>${esc(holidayName(c.name || 'Geschlossen'))}, ${esc(when)}</span><span>${hours}</span></li>`;
  }).join('');
  return `<div class="closed-days" data-closed-days${list ? '' : ' hidden'}><b>${L('Abweichende Öffnungszeiten', 'Special opening hours')}</b><ul>${list}</ul></div>`;
}

// The shop sign of the home page: live status, today's hours as a bar, address
function shopSign(ctx) {
  const r = hoursRange(ctx);
  return `<div class="sign">
<div class="sign-top"><span class="status" data-status><span class="dot"></span><span data-status-text>${L('Öffnungszeiten', 'Opening hours')}</span></span><a class="sign-more" href="#oeffnungszeiten">${L('Alle Zeiten', 'All times')}</a></div>
<span class="sign-day">${track('', r, ' data-today-track')}${hoursScale(r)}</span>
<p class="sign-text"><b data-today-hours></b><span>${esc(COMPANY.street)}, ${COMPANY.zip} ${COMPANY.city}</span></p>
<div class="btns"><a class="btn btn-sm" href="${MAPS.route}" target="_blank" rel="noopener">${icon('route')}${L('Route planen', 'Get directions')}</a><a class="btn btn-sm btn-quiet" href="${COMPANY.phoneHref}">${icon('phone')}${L('Anrufen', 'Call')}</a></div>
</div>`;
}

function hoursCard(ctx, { title = L('Öffnungszeiten', 'Opening hours'), id = 'oeffnungszeiten' } = {}) {
  const s = seasons(ctx);
  const note = s.otherSchedule && describeWeek(s.otherSchedule) !== describeWeek(s.current)
    ? `<p class="season-note">${s.cur === 'standard' ? L(`Im Winter (${seasonLabel('winter')})`, `In winter (${seasonLabel('winter')})`) : L(`Von ${seasonLabel('standard')}`, `From ${seasonLabel('standard')}`)}: ${esc(describeWeek(s.otherSchedule))}.</p>`
    : '';
  const valid = s.cur === 'winter'
    ? L(`Winteröffnungszeiten, gültig ${seasonLabel('winter')}.`, `Winter opening hours, valid ${seasonLabel('winter')}.`)
    : L(`Gültig ${seasonLabel('standard')}.`, `Valid ${seasonLabel('standard')}.`);
  return `<div class="visit-card" id="${id}">
<div class="visit-head"><h3>${title}</h3><span class="status" data-status><span class="dot"></span><span data-status-text>${L('Öffnungszeiten', 'Opening hours')}</span></span></div>
${weekBlock(ctx, s.current)}
<p class="season-note">${valid} ${L('An gesetzlichen Feiertagen geschlossen.', 'Closed on public holidays.')}</p>
${note}
${closedDaysBlock(ctx.closedDays)}
<ul class="contact-lines">
<li>${icon('pin')}<span>${esc(COMPANY.legalName)}<br>${esc(ADDRESS_LINE)}${L('', ', Germany')}</span></li>
<li>${icon('phone')}<span><a href="${COMPANY.phoneHref}">${COMPANY.phone}</a><br><small class="muted">${L('Auch für Werkstatt, Reparaturannahme und Ersatzteile', 'Also for the workshop, repair drop-off and spare parts')}</small></span></li>
<li>${icon('mail')}<a href="mailto:${COMPANY.email}">${COMPANY.email}</a></li>
</ul>
<div class="btns"><a class="btn" href="${MAPS.route}" target="_blank" rel="noopener">${icon('route')}${L('Route mit Google Maps', 'Directions with Google Maps')}</a><a class="btn btn-quiet" href="${MAPS.appleRoute}" target="_blank" rel="noopener">${L('Apple Karten', 'Apple Maps')}</a></div>
</div>`;
}

// Until the visitor agrees, a drawn map of the Fehn instead of Google Maps:
// the canal with the long narrow fields at right angles, the side canals,
// Langholter Straße, our house with the test track. The house is in the
// middle of the drawing, so the pin (HTML, always readable) sits on it at
// every size of the box.
function mapArt() {
  const strip = (x, y, len, lean, f) => `<path class="field f${f}" d="M${x} ${y}h42l${lean} ${len}h-42z"/>`;
  const fields = [];
  for (let i = 0; i < 16; i += 1) {
    const x = -44 + i * 48;
    fields.push(strip(x, -10, 174, 3, i % 3), strip(x + 4, 198, 206, 4, (i + 1) % 3), strip(x + 8, 442, 180, 5, (i + 2) % 3), strip(x + 14, 666, 314, 10, i % 3));
  }
  const wieken = [];
  for (let i = 0; i < 5; i += 1) wieken.push(`M${34 + i * 144} 198l4 206`, `M${40 + i * 144} 442l5 180`, `M${58 + i * 144} 666l10 314`);
  return `<svg class="map-art" viewBox="0 0 640 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<rect class="land" width="640" height="960"/>
${fields.join('')}
<path class="water side" d="${wieken.join(' ')}"/>
<path class="water main" d="M-20 424C180 416 420 430 660 414"/>
<path class="road" d="M232 -20C236 160 240 300 244 440S262 640 256 760S240 920 246 980"/>
<path class="road minor" d="M-20 186C120 180 200 174 236 172S520 160 660 156"/>
<path class="road minor" d="M-20 652C120 642 200 632 254 628S520 616 660 606"/>
<path class="track" d="M296 552c22-14 46 8 70-2s40-14 54 2-10 30-44 30-56-8-80-30z"/>
<rect class="bld" x="274" y="480" width="92" height="42" rx="4"/>
</svg>`;
}

function mapBlock() {
  return `<div class="map" data-map data-embed="${esc(MAPS.embed)}">
<div class="map-gate">
${mapArt()}
<span class="map-pin" aria-hidden="true"><svg viewBox="-24 -66 48 68" focusable="false"><path d="M0 0C-14-18-22-29-22-42a22 22 0 0 1 44 0C22-29 14-18 0 0z"/><circle cy="-42" r="8"/></svg><b>Wilken Poelker</b></span>
<div class="box">
<p>${L('<b>Karte von Google Maps anzeigen?</b> Die Karte wird erst nach Ihrem Klick geladen. Dabei werden Ihre IP-Adresse und technische Daten an Google übertragen.', '<b>Show the map from Google Maps?</b> The map is only loaded after you click. Your IP address and technical data are then sent to Google.')} <a href="/datenschutz.html#karte">${L('Mehr dazu', 'More about this')}</a></p>
<label class="check"><input type="checkbox" data-map-remember> ${L('Für diesen Browser merken', 'Remember for this browser')}</label>
<div class="btns"><button class="btn btn-sm" type="button" data-map-load>${L('Karte laden', 'Load map')}</button><a class="btn btn-sm btn-quiet" href="${MAPS.open}" target="_blank" rel="noopener">${icon('external')}${L('In Google Maps öffnen', 'Open in Google Maps')}</a></div>
</div>
</div>
</div>`;
}

function visitSection(ctx, {
  heading = L('Besuchen Sie uns in Ostrhauderfehn', 'Visit us in Ostrhauderfehn'),
  text = L('Mitten im südlichen Ostfriesland, an der Langholter Straße: große Ausstellung, Werkstätten, Ersatzteillager und die Teststrecke im Freien. Gut erreichbar aus Rhauderfehn, Westoverledingen, Leer, Papenburg und dem Saterland.',
    'In the heart of southern East Frisia, on Langholter Straße: a large showroom, workshops, a spare parts stock and the outdoor test track. Easy to reach from Rhauderfehn, Westoverledingen, Leer, Papenburg and the Saterland.'),
  id = 'besuch', band = false,
} = {}) {
  return `<section class="sec${band ? ' band' : ''}" id="${id}">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${heading}</h2><p>${text}</p></div></div>
<div class="visit">
${hoursCard(ctx)}
${mapBlock()}
</div>
</div>
</section>`;
}

// ── FAQ ───────────────────────────────────────────────
function faqBlock(list) {
  return `<div class="faq">${list.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="ans"><p>${esc(a)}</p></div></details>`).join('')}</div>`;
}

// ── Google reviews (filled by site.js when the section comes into view) ──
function reviewsSection({ id = 'bewertungen', band = false } = {}) {
  const skel = '<div class="review" aria-hidden="true"><span class="skel" style="display:block;height:14px;width:40%"></span><span class="skel" style="display:block;height:12px;margin-top:18px"></span><span class="skel" style="display:block;height:12px;width:88%"></span><span class="skel" style="display:block;height:12px;width:72%"></span><div class="review-head" style="margin-top:auto"><span class="av skel"></span><span style="flex:1"><span class="skel" style="display:block;height:12px;width:50%"></span></span></div></div>';
  return `<section class="sec${band ? ' band' : ''}" id="${id}" data-reviews>
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Was unsere Kundinnen und Kunden sagen', 'What our customers say')}</h2><p>${L('Echte Bewertungen von Google, direkt beim Aufruf der Seite geladen.', 'Real reviews from Google, loaded when you open the page. Google provides them in German.')}</p></div><a class="btn btn-quiet" data-reviews-write href="${MAPS.open}" target="_blank" rel="noopener">${icon('star')}${L('Bewertung schreiben', 'Write a review')}</a></div>
<div class="reviews-top" data-reviews-top></div>
<div class="review-grid" data-reviews-list>${skel.repeat(3)}</div>
<p class="reviews-note" data-reviews-note></p>
</div>
</section>`;
}

// ── App ───────────────────────────────────────────────
function storeButtons() {
  return `<div class="stores">
<a class="store-btn" href="${COMPANY.appStore}" target="_blank" rel="noopener">${icon('smartphone')}<span><small>${L('Laden im', 'Download on the')}</small>App Store</span></a>
<a class="store-btn" href="${COMPANY.playStore}" target="_blank" rel="noopener">${icon('smartphone')}<span><small>${L('Jetzt bei', 'Get it on')}</small>Google Play</span></a>
</div>
<div class="qrs">
<figure><img src="/assets/img/qr-app-store.svg" alt="${L('QR-Code zur App im App Store', 'QR code for the app in the App Store')}" width="104" height="104" loading="lazy"><figcaption>iPhone</figcaption></figure>
<figure><img src="/assets/img/qr-google-play.svg" alt="${L('QR-Code zur App bei Google Play', 'QR code for the app on Google Play')}" width="104" height="104" loading="lazy"><figcaption>Android</figcaption></figure>
</div>`;
}

function phone() {
  const shots = txt().APP_FEATURES.map(([key, , label], i) => `<img${i === 0 ? ' class="on"' : ''} src="/assets/img/app/${key}-360.webp" srcset="/assets/img/app/${key}-360.webp 360w, /assets/img/app/${key}-720.webp 720w" sizes="300px" width="360" height="730" alt="${L('App-Bildschirm', 'App screen')}: ${esc(label)}" data-screen="${key}" loading="lazy" decoding="async">`).join('');
  return `<div class="phone-stage"><div class="phone"><div class="phone-screen">${shots}</div></div></div>`;
}

function appBand({ heading = L('Ihr Draht zu uns, direkt auf dem Handy', 'Your direct line to us, right on your phone'), headingTag = 'h2' } = {}) {
  const feats = txt().APP_FEATURES.map(([key, ic, title, text], i) => `<li><button type="button" data-screen-btn="${key}" aria-pressed="${i === 0}">${icon(ic)}<b>${esc(title)}</b><span>${esc(text)}</span></button></li>`).join('');
  return `<div class="app-band" data-app>
<div class="app-grid">
<div>
<img class="app-icon" src="/assets/img/app-icon.png" alt="" width="192" height="192" loading="lazy">
<${headingTag}>${heading}</${headingTag}>
<p class="lead">${L('Mit der kostenlosen Wilken-Poelker-App für iPhone und Android verfolgen Sie Ihre Reparatur, fragen Termine an und schreiben unserem Team, auch mit Foto. Ihr Kundenkonto führen Sie bequem in der App.', 'With the free Wilken Poelker app for iPhone and Android you can follow your repair, request appointments and write to our team, with photos too. You manage your customer account in the app, in German or English.')}</p>
<ul class="app-feats">${feats}</ul>
${storeButtons()}
</div>
${phone()}
</div>
</div>`;
}

// ── Inquiry form (product pages, contact page) ────────
function inquiryForm({ prefix = 'f', topic = 'produkt', product = null, topics = false, selected = 'allgemein', submit = L('Anfrage senden', 'Send inquiry') } = {}) {
  const topicField = topics
    ? `<fieldset class="topics"><legend>${L('Worum geht es?', 'What is it about?')}</legend>${txt().TOPICS.map(([key, label]) => `<label><input type="radio" name="topic" value="${key}"${key === selected ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('')}</fieldset>`
    : `<input type="hidden" name="topic" value="${esc(topic)}">`;
  const productFields = product
    ? `<input type="hidden" name="slug" value="${esc(product.slug)}"><input type="hidden" name="productTitle" value="${esc(product.title)}"><input type="hidden" name="artNr" value="${esc(product.variants?.[0]?.artNr || '')}" data-artnr>`
    : '';
  const placeholder = product
    ? L('Zum Beispiel: Ist das Gerät vorrätig? Können Sie es für mich zurücklegen?', 'For example: Is it in stock? Can you put it aside for me?')
    : L('Wie können wir Ihnen helfen?', 'How can we help you?');
  return `<form class="form" data-inquiry novalidate>
${topicField}${productFields}
<div class="row">
<div class="field"><label for="${prefix}-name">${L('Ihr Name', 'Your name')}</label><input id="${prefix}-name" name="name" autocomplete="name" required minlength="2" maxlength="120"></div>
<div class="field"><label for="${prefix}-phone">${L('Telefon', 'Phone')}</label><input id="${prefix}-phone" name="phone" type="tel" autocomplete="tel" required maxlength="40"></div>
</div>
<div class="field" data-email-field><label for="${prefix}-email">${L('E-Mail', 'Email')} <small data-email-optional hidden>${L('(freiwillig)', '(optional)')}</small></label><input id="${prefix}-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
<div class="field"><label for="${prefix}-msg"><span data-msg-label>${L('Ihre Nachricht', 'Your message')}</span> <small>${L('(freiwillig)', '(optional)')}</small></label><textarea id="${prefix}-msg" name="message" maxlength="2000" placeholder="${esc(placeholder)}"></textarea></div>
<div class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="form-msg" data-form-msg role="alert" hidden></p>
<div class="btns"><button class="btn" type="submit">${icon('mail')}${submit}</button><a class="btn btn-ghost" href="${COMPANY.phoneHref}">${icon('phone')}${L('Lieber anrufen', 'Call instead')}</a></div>
<p class="form-note">${L('Ihre Anfrage ist unverbindlich und keine Bestellung. Wir verwenden Ihre Angaben nur, um Ihnen zu antworten', 'Your inquiry is non-binding and not an order. We only use your details to reply to you')} (<a href="/datenschutz.html#anfragen">${L('Datenschutz', 'privacy')}</a>).</p>
</form>`;
}

module.exports = {
  priceInline, offerTag, availText, productCard, photoImg, crumbs, describeWeek, hoursText, hoursRange, weekBlock, hoursCard,
  shopSign, closedDaysBlock, mapBlock, visitSection, faqBlock, reviewsSection, appBand, storeButtons, phone, inquiryForm, seasonLabel,
};
