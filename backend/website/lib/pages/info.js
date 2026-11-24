// Company pages: bikes, leasing, service, about us, career, app, contact
const { esc, plural } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY, MAPS, LEASING_PARTNERS, txt } = require('../content');
const { L, isEn, depName, positionName } = require('../i18n');
const seo = require('../seo');
const { recommended } = require('./catalog');

const DEP_TEXT = {
  Geschaeftsfuehrung: ['Familienbetrieb in dritter Generation', 'Family business in the third generation'],
  Buchhaltung: ['Rechnungen, Garantiefälle und Verwaltung', 'Invoices, warranty claims and administration'],
  'Service / Reparatur': ['Ihr erster Kontakt bei Reparaturen und Ersatzteilen', 'Your first contact for repairs and spare parts'],
  'Verkauf E-Bikes': ['Beratung, Probefahrt und Leasing', 'Advice, test rides and leasing'],
  'Verkauf Motorgeraete / Kaercher': ['Garten-, Forst- und Reinigungstechnik', 'Garden, forestry and cleaning equipment'],
  'Werkstatt Zweirad': ['Zweiradmechatroniker und Zweiradmechanikermeisterin', 'Bicycle mechatronics technicians and a master bicycle mechanic'],
  'Werkstatt Motorgeraete': ['Wartung und Reparatur unter eigener Leitung', 'Maintenance and repair under its own management'],
  Maehroboter: ['Beratung und Betreuung durch Experten', 'Advice and care by experts'],
  Kaercher: ['Kärcher-Werkstatt mit Monteur im Außendienst', 'Kärcher workshop with a field service technician'],
  Hausmeister: ['Damit im Haus alles läuft', 'Keeping everything in the building running'],
};
const depText = (key) => (DEP_TEXT[key] ? L(...DEP_TEXT[key]) : '');
const HOME = () => [L('Start', 'Home'), '/'];

const telHref = (n) => `tel:+49${String(n).replace(/\D/g, '').replace(/^0/, '')}`;
// English pages: written for calls from abroad (+49, without the leading 0)
const telText = (n) => {
  const s = String(n).replace('/', ' ').trim();
  return isEn() ? `+49 ${s.replace(/^0/, '')}` : s;
};
const initials = (name) => String(name).split(/\s+/).filter(Boolean).map((w) => w[0]).filter((ch, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();

async function member(ctx, m) {
  const p = await ctx.images.portrait(m.image);
  return `<li><div class="ph">${p ? `<img src="${p.src}" alt="${esc(m.name)}" width="360" height="360" loading="lazy">` : `<span class="ini" aria-hidden="true">${esc(initials(m.name))}</span>`}</div><div class="tx"><b>${esc(m.name)}</b><span>${esc(positionName(m.position))}</span>${m.phone ? `<a href="${telHref(m.phone)}">${esc(telText(m.phone))}</a>` : ''}</div></li>`;
}

async function teamList(ctx, keys) {
  const out = [];
  for (const dep of ctx.team) {
    if (keys && !keys.includes(dep.key)) continue;
    const items = [];
    for (const m of dep.members) items.push(await member(ctx, m));
    const t = depText(dep.key);
    out.push(`<div class="team-dep"><h3>${esc(depName(dep.key, dep.label))}</h3>${t ? `<p class="muted" style="margin:-6px 0 14px">${esc(t)}</p>` : ''}<ul class="team">${items.join('')}</ul></div>`);
  }
  return out.join('');
}

// Direct numbers of the departments (from the team list of the app)
function directNumbers(ctx, keys) {
  const rows = [];
  for (const dep of ctx.team) {
    if (keys && !keys.includes(dep.key)) continue;
    for (const m of dep.members) if (m.phone) rows.push(`<li><span>${esc(m.position ? positionName(m.position) : depName(dep.key, dep.label))}<br><small class="muted">${esc(m.name)}</small></span><a href="${telHref(m.phone)}">${esc(telText(m.phone))}</a></li>`);
  }
  return rows.length ? `<ul class="direct">${rows.join('')}</ul>` : '';
}

async function gallery(ctx, names, alt) {
  const items = [];
  for (const n of names) {
    const ph = await ctx.images.photo(n);
    items.push(`<button type="button" data-zoom="${ph.large}" aria-label="${L('Foto vergrößern', 'Enlarge photo')}">${C.photoImg(ph, { alt, sizes: '(max-width: 760px) 50vw, 25vw' })}</button>`);
  }
  return `<div class="gallery" data-gallery>${items.join('')}</div>
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="${L('Foto', 'Photo')}"><button class="icon-btn" type="button" data-lb-close aria-label="${L('Schließen', 'Close')}">${icon('close')}</button><button class="icon-btn nav-b prev" type="button" data-lb-prev aria-label="${L('Vorheriges Foto', 'Previous photo')}">${icon('chevron-left')}</button><img alt="${esc(alt)}"><button class="icon-btn nav-b next" type="button" data-lb-next aria-label="${L('Nächstes Foto', 'Next photo')}">${icon('chevron-right')}</button></div>`;
}

function phead({ trail, title, lead, photo, alt, extra = '' }) {
  return `<section class="phead">
<div class="wrap${photo ? ' phead-photo' : ''}">
<div>
${C.crumbs(trail)}
<h1>${title}</h1>
<p class="lead">${lead}</p>
${extra}
</div>
${photo ? `<div class="ph">${C.photoImg(photo, { alt, sizes: '(max-width: 860px) 100vw, 42vw', eager: true })}</div>` : ''}
</div>
</section>`;
}

// ── Fahrräder ─────────────────────────────────────────
async function bikes(ctx) {
  const photo = await ctx.images.photo('bikes-area2');
  const title = L('Fahrräder und E-Bikes', 'Bicycles and e-bikes');
  const trail = [HOME(), [title, '/fahrraeder.html']];
  const fromStock = ctx.products.filter((p) => p.main === 'Fahrräder').sort(recommended);
  const cat = ctx.categories.find((c) => c.name === 'Fahrräder');
  const consent = L(`Unser Fahrradkatalog wird von der <b>BIDEX GmbH</b> (Ennepetal) bereitgestellt. Erst wenn Sie auf „Katalog laden“ klicken, werden Inhalte von deren Servern geladen. Dabei werden Ihre IP-Adresse und technische Daten an BIDEX und deren Dienstleister übertragen, und im Speicher Ihres Browsers wird Ihre letzte Ansicht gespeichert. In der Detailansicht eines Rades können außerdem ein Ratenkauf-Rechner (easyCredit, TeamBank AG) und eine Größenberatung (Smartfit, Radlabor GmbH) geladen werden. Mehr dazu in unserer <a href="/datenschutz.html#fahrradkatalog">Datenschutzerklärung</a>. Ihre Einwilligung können Sie jederzeit widerrufen.`,
    `Our bicycle catalogue is provided by <b>BIDEX GmbH</b> (Ennepetal, Germany). Content is only loaded from their servers once you click “Load catalogue”. Your IP address and technical data are then transferred to BIDEX and its service providers, and your last view is saved in your browser’s storage. In the detail view of a bike, an instalment calculator (easyCredit, TeamBank AG) and a size advisor (Smartfit, Radlabor GmbH) may also be loaded. The catalogue content comes from BIDEX and may only be available in German. More in our <a href="/datenschutz.html#fahrradkatalog">privacy policy</a>. You can withdraw your consent at any time.`);
  const body = `
${phead({
    trail,
    title,
    lead: L(`Vom Kinderrad bis zum E-Bike: In unserer Fahrradausstellung vergleichen Sie in Ruhe und fahren auf unserer ${COMPANY.testTrack} großen Teststrecke Probe. Im Fahrradkatalog sehen Sie unser Sortiment mit Ausstattung, Größen und Verfügbarkeit.`,
      `From children’s bikes to e-bikes: in our bicycle showroom you can compare at your leisure and take a test ride on our ${COMPANY.testTrack} test track. The bicycle catalogue shows our range with equipment, sizes and availability.`),
    photo,
    alt: L('Fahrradausstellung bei Wilken Poelker', 'Bicycle showroom at Wilken Poelker'),
    extra: `<div class="chips" style="margin-top:22px"><a class="chip" href="#katalog">${L('Fahrradkatalog', 'Bicycle catalogue')}</a><a class="chip" href="/e-bike-leasing.html">${L('E-Bike-Leasing', 'E-bike leasing')}</a><a class="chip" href="/service.html#zweirad">${L('Zweiradwerkstatt', 'Bicycle workshop')}</a>${cat ? `<a class="chip" href="${cat.url}">${L('E-Bikes aus unserem Bestand', 'E-bikes in stock')}</a>` : ''}</div>`,
  })}
<section class="sec-tight" id="katalog">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Fahrradkatalog', 'Bicycle catalogue')}</h2><p>${L('E-Bikes, Trekking-, City- und Kinderräder mit Ausstattung, Größen und Verfügbarkeit. Ihr Wunschrad können Sie unverbindlich reservieren und bei uns Probe fahren.', 'E-bikes, trekking, city and children’s bikes with equipment, sizes and availability. You can reserve the bike you want without obligation and take it for a test ride at our shop.')}</p></div></div>
<div class="card" id="bike-gate">
<h3>${L('Fahrradkatalog anzeigen', 'Show the bicycle catalogue')}</h3>
<p>${consent}</p>
<label class="check"><input type="checkbox" id="bike-remember"> ${L('Auswahl für diesen Browser merken', 'Remember my choice in this browser')}</label>
<div class="btns" style="margin-top:16px"><button type="button" class="btn" id="bike-load">${icon('bike')}${L('Katalog laden', 'Load catalogue')}</button><a class="btn btn-quiet" href="${COMPANY.phoneHref}">${icon('phone')}${L('Lieber anrufen', 'Call instead')}: ${COMPANY.phone}</a></div>
</div>
<div id="BidexCatalog"></div>
<p id="bike-revoke" class="note" hidden>${L('Der Fahrradkatalog wird von der BIDEX GmbH bereitgestellt.', 'The bicycle catalogue is provided by BIDEX GmbH.')} <a href="#" id="bike-revoke-link">${L('Einwilligung widerrufen und Katalog ausblenden', 'Withdraw consent and hide the catalogue')}</a></p>
</div>
</section>
${fromStock.length ? `<section class="sec band"><div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('E-Bikes aus unserem Bestand', 'E-bikes in stock')}</h2><p>${L('Mit Preis und Verfügbarkeit aus unserer Warenwirtschaft.', 'With price and availability from our merchandise management system.')}</p></div>${cat ? `<a class="link-more" href="${cat.url}">${L('Alle ansehen', 'View all')}${icon('arrow-right')}</a>` : ''}</div>
<div class="rail">${fromStock.slice(0, 12).map((p) => C.productCard(p, ctx.productImages.get(p.slug)?.[0])).join('')}</div>
</div></section>` : ''}
<section class="sec">
<div class="wrap">
<div class="cards3">
<div class="card"><span class="card-ico">${icon('route')}</span><h3>${L('Beratung und Probefahrt', 'Advice and test ride')}</h3><p>${L(`Wir finden das passende Rad für Ihren Alltag, und Sie testen es auf unserer ${COMPANY.testTrack} großen Teststrecke.`, `We find the right bike for your everyday life, and you try it out on our ${COMPANY.testTrack} test track.`)}</p></div>
<div class="card"><span class="card-ico">${icon('euro')}</span><h3>${L('E-Bike-Leasing', 'E-bike leasing')}</h3><p>${L(`Über ${LEASING_PARTNERS.join(', ')}.`, `Through ${LEASING_PARTNERS.join(', ')}.`)} <a href="/e-bike-leasing.html">${L('So funktioniert es', 'How it works')}</a></p></div>
<div class="card"><span class="card-ico">${icon('wrench')}</span><h3>${L('Zweiradwerkstatt', 'Bicycle workshop')}</h3><p>${L('Inspektion, Reparatur und E-Bike-Service durch unsere Zweiradmechatroniker und eine Zweiradmechanikermeisterin.', 'Inspection, repair and e-bike service by our bicycle mechatronics technicians and a master bicycle mechanic.')}</p></div>
</div>
</div>
</section>
<section class="sec band">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Unsere Fahrradausstellung', 'Our bicycle showroom')}</h2><p>${L('Kinderräder, E-Bikes, Lastenräder, Dreiräder, Helme und Zubehör.', 'Children’s bikes, e-bikes, cargo bikes, tricycles, helmets and accessories.')}</p></div></div>
${await gallery(ctx, ['showroom1', 'showroom2', 'outdoor2', 'outdoor1', 'bikes-area', 'showroom3'], L('Fahrradausstellung bei Wilken Poelker', 'Bicycle showroom at Wilken Poelker'))}
</div>
</section>
<section class="sec">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Ihre Ansprechpartner', 'Your contacts')}</h2><p>${L('Unser Team aus Verkauf und Zweiradwerkstatt.', 'Our team from sales and the bicycle workshop.')}</p></div></div>
${await teamList(ctx, ['Verkauf E-Bikes', 'Werkstatt Zweirad'])}
</div>
</section>`;
  return page(ctx, {
    path: '/fahrraeder.html',
    nav: 'fahrraeder',
    title: L('Fahrräder und E-Bikes in Ostrhauderfehn | Wilken Poelker', 'Bicycles and e-bikes in Ostrhauderfehn | Wilken Poelker'),
    description: L('E-Bikes und Fahrräder in Ostrhauderfehn: Fahrradkatalog mit Verfügbarkeit, Probefahrt auf 2.500 m² Teststrecke, E-Bike-Leasing und eigene Zweiradwerkstatt.',
      'E-bikes and bicycles in Ostrhauderfehn, Germany: bicycle catalogue with availability, test rides on a 2,500 m² test track, e-bike leasing and our own bicycle workshop.'),
    ogImage: photo.large,
    head: `<link rel="stylesheet" href="${ctx.asset('assets/bidex.css')}">\n`,
    thirdParty: true, // BIDEX catalogue: loose Content Security Policy (layout.js)
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── E-Bike-Leasing ────────────────────────────────────
async function leasing(ctx) {
  const photo = await ctx.images.photo('showroom2');
  const trail = [HOME(), [L('Fahrräder', 'Bicycles'), '/fahrraeder.html'], [L('E-Bike-Leasing', 'E-bike leasing'), '/e-bike-leasing.html']];
  const list = isEn() ? [
    ['How does bike leasing through an employer work?', 'You check with your employer which provider is used for leasing, choose your bike at our shop and take a test ride. The paperwork runs through your employer and the leasing provider; we hand the bike over ready to ride and take care of inspections and repairs.'],
    ['Which leasing providers do you work with?', `With ${LEASING_PARTNERS.join(', ')}.`],
    ['Where can I find out about the terms?', 'Your employer or the leasing provider can tell you about the terms.'],
  ] : [
    ['Wie läuft Dienstrad-Leasing ab?', 'Sie klären mit Ihrem Arbeitgeber, über welchen Anbieter geleast wird, suchen Ihr Rad bei uns aus und fahren Probe. Die Abwicklung läuft über Ihren Arbeitgeber und den Leasing-Anbieter, wir übergeben das Rad fahrbereit und übernehmen Inspektion und Reparatur.'],
    ['Mit welchen Leasing-Anbietern arbeiten Sie zusammen?', `Mit ${LEASING_PARTNERS.join(', ')}.`],
    ['Wo erfahre ich die Konditionen?', 'Informationen zu Konditionen erhalten Sie bei Ihrem Arbeitgeber oder direkt beim jeweiligen Leasing-Anbieter.'],
  ];
  const body = `
${phead({
    trail,
    title: L('E-Bike-Leasing: Ihr Dienstrad vom Fachhändler', 'E-bike leasing: your company bike from a specialist dealer'),
    lead: L('Viele Arbeitgeber bieten ihren Beschäftigten ein Dienstrad-Leasing an. Wir arbeiten mit fünf großen Leasing-Anbietern zusammen. So suchen Sie Ihr Wunschrad bei uns aus, fahren es Probe und lassen es später bei uns warten.',
      'Many employers in Germany offer their staff a company bike through leasing. We work with five large leasing providers, so you can choose the bike you want at our shop, take it for a test ride and have it serviced by us later.'),
    photo,
    alt: L('E-Bikes in unserer Ausstellung', 'E-bikes in our showroom'),
  })}
<section class="sec-tight">
<div class="wrap">
<h2>${L('So funktioniert es', 'How it works')}</h2>
<ol class="steps" style="grid-template-columns:repeat(4,minmax(0,1fr))">${txt().LEASING_STEPS.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
</div>
</section>
<section class="sec band">
<div class="wrap split">
<div>
<h2>${L('Unsere Leasing-Partner', 'Our leasing partners')}</h2>
<p class="lead">${L('Fragen Sie bei Ihrem Arbeitgeber nach, welcher Anbieter genutzt wird. Wir beraten Sie gern.', 'Ask your employer which provider is used. We are happy to advise you.')}</p>
<div class="partners" style="margin-top:20px">${LEASING_PARTNERS.map((p) => `<span>${esc(p)}</span>`).join('')}</div>
</div>
<div class="card">
<h3>${L('Ihre Vorteile bei uns', 'Your advantages with us')}</h3>
<ul class="ticks">${L(`<li>Große Auswahl an E-Bikes und Fahrrädern</li><li>Probefahrt auf ${COMPANY.testTrack} Teststrecke</li><li>Übergabe fahrbereit, mit Einweisung</li><li>Inspektion und Reparatur in der eigenen Zweiradwerkstatt</li>`,
    `<li>A large choice of e-bikes and bicycles</li><li>Test ride on a ${COMPANY.testTrack} test track</li><li>Handover ready to ride, with an introduction</li><li>Inspection and repair in our own bicycle workshop</li>`)}</ul>
<div class="btns" style="margin-top:20px"><a class="btn" href="/kontakt.html?thema=fahrrad">${icon('mail')}${L('Beratung anfragen', 'Ask for advice')}</a><a class="btn btn-quiet" href="/fahrraeder.html#katalog">${icon('bike')}${L('Fahrradkatalog', 'Bicycle catalogue')}</a></div>
</div>
</div>
</section>
<section class="sec"><div class="wrap"><h2>${L('Häufige Fragen zum Leasing', 'Frequently asked questions about leasing')}</h2>${C.faqBlock(list)}</div></section>`;
  return page(ctx, {
    path: '/e-bike-leasing.html',
    nav: 'fahrraeder',
    title: L('E-Bike-Leasing mit JobRad, Lease a Bike und mehr | Wilken Poelker', 'E-bike leasing with JobRad, Lease a Bike and more | Wilken Poelker'),
    description: L('Dienstrad-Leasing in Ostrhauderfehn mit JobRad, Lease a Bike, Bikeleasing, Businessbike und Eurorad / AGL. Beratung, Probefahrt und Service vom Fachhändler.',
      'Company bike leasing in Ostrhauderfehn with JobRad, Lease a Bike, Bikeleasing, Businessbike and Eurorad / AGL. Advice, test rides and service from a specialist dealer.'),
    ogImage: photo.large,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.faqPage(list)],
    body,
  });
}

// ── Werkstatt und Service ─────────────────────────────
async function service(ctx) {
  const { WORKSHOPS, REPAIR_STEPS, SERVICES, QMF_ITEMS, KAERCHER_ITEMS } = txt();
  const photo = await ctx.images.photo('laden10');
  const title = L('Werkstatt und Service', 'Workshop and service');
  const trail = [HOME(), [title, '/service.html']];
  const shops = [];
  for (const w of WORKSHOPS) {
    const faces = [];
    for (const dep of ctx.team.filter((d) => w.departments.includes(d.key))) {
      for (const m of dep.members) {
        const p = await ctx.images.portrait(m.image);
        if (p) faces.push(`<li><img src="${p.small}" alt="${esc(m.name)}" title="${esc(m.name)}, ${esc(positionName(m.position))}" width="128" height="128" loading="lazy"></li>`);
      }
    }
    shops.push(`<div class="card" id="${w.id}"><span class="card-ico">${icon(w.icon)}</span><h3>${w.title}</h3><p>${w.text}</p><ul class="ticks">${w.points.map((x) => `<li>${x}</li>`).join('')}</ul>${faces.length ? `<ul class="faces" style="grid-template-columns:repeat(auto-fill,minmax(44px,1fr));margin-top:18px">${faces.slice(0, 8).join('')}</ul>` : ''}</div>`);
  }
  const chips = [['#werkstaetten', 'Werkstätten', 'Workshops'], ['#ablauf', 'Reparatur-Ablauf', 'Repair process'], ['#leistungen', 'Leistungen', 'Services'], ['#zertifikate', 'QMF und Kärcher', 'QMF and Kärcher'], ['#kontakt', 'Gerät anmelden', 'Book a repair']]
    .map(([h, de, en]) => `<a class="chip" href="${h}">${L(de, en)}</a>`).join('');
  const body = `
${phead({
    trail,
    title,
    lead: L('Service, der nach dem Kauf erst richtig anfängt: Beratung, Übergabe, Einweisung, Wartung, Reparatur und Ersatzteile, alles aus einer Hand und unter einem Dach in Ostrhauderfehn.',
      'Service that really starts after the purchase: advice, handover, introduction, maintenance, repair and spare parts, all from one source and under one roof in Ostrhauderfehn.'),
    photo,
    alt: L('Blick in unser Geschäft', 'A look inside our shop'),
    extra: `<div class="chips" style="margin-top:22px">${chips}</div>`,
  })}
<section class="sec-tight" id="werkstaetten">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Vier Fachbereiche, ein Team', 'Four specialist areas, one team')}</h2><p>${L('Für jede Gerätegruppe gibt es bei uns Spezialisten: ausgebildete Zweiradmechatroniker, Motorgeräte-Mechaniker, Kärcher-Techniker und Mähroboter-Experten.', 'We have specialists for every type of equipment: trained bicycle mechatronics technicians, power tool mechanics, Kärcher technicians and robotic mower experts.')}</p></div></div>
<div class="cards2">${shops.join('')}</div>
</div>
</section>
<section class="sec band" id="ablauf">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('So läuft Ihre Reparatur', 'How your repair works')}</h2><p>${L('Transparent von der Annahme bis zur Abholung. Mit unserer App sehen Sie jeden Schritt auf dem Handy.', 'Transparent from drop-off to collection. With our app you can follow every step on your phone.')}</p></div><a class="link-more" href="/app.html">${L('Zur App', 'The app')}${icon('arrow-right')}</a></div>
<ol class="steps">${REPAIR_STEPS.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
</div>
</section>
<section class="sec" id="leistungen">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Alles, was dazugehört', 'Everything that goes with it')}</h2><p>${L('Vom ersten Gespräch bis zur zehnten Inspektion.', 'From the first conversation to the tenth inspection.')}</p></div></div>
<ul class="svc">${SERVICES.map(([ic, t, d]) => `<li><span class="ico">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ul>
</div>
</section>
<section class="sec band" id="zertifikate">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Zertifiziert und autorisiert', 'Certified and authorised')}</h2></div></div>
<div class="cards2">
<div class="card"><img src="/assets/img/qmf.webp" alt="QMF – Qualität mit Fachbetrieb" width="260" height="137" loading="lazy" style="height:64px;width:auto;margin-bottom:14px;border-radius:8px"><h3>${L('QMF: Qualität mit Fachbetrieb', 'QMF: Qualität mit Fachbetrieb (quality from a specialist)')}</h3><p>${L('QMF ist eine Qualifizierungsinitiative der Fachverbände des Landmaschinen- und Motorgerätehandwerks. Zertifizierte Betriebe zeichnen sich durch besondere Servicequalität und Fachkompetenz aus, erfüllen strenge Kriterien und werden regelmäßig überprüft. Wir sind QMF-zertifiziert für:',
    'QMF is a qualification initiative of the German trade associations for agricultural machinery and power equipment. Certified businesses stand out for their service quality and expertise, meet strict criteria and are checked regularly. We are QMF-certified for:')}</p><ul class="ticks">${QMF_ITEMS.map((x) => `<li>${x}</li>`).join('')}</ul></div>
<div class="card"><img src="/assets/img/kaercher-haendler.png" alt="Kärcher" width="480" height="119" loading="lazy" style="height:44px;width:auto;margin:10px 0 24px"><h3>${L('Autorisierter Kärcher-Händler', 'Authorised Kärcher dealer')}</h3><p>${L('Wir vertreiben die gesamte Palette des weltweit führenden Anbieters von Reinigungssystemen und bieten den passenden Service dazu: eigene Kärcher-Werkstatt, Monteur im Außendienst und Beratung für Privat und Gewerbe.',
    'We sell the entire range of the world’s leading provider of cleaning systems and offer the service that goes with it: our own Kärcher workshop, a field service technician and advice for private and business customers.')}</p><ul class="ticks">${KAERCHER_ITEMS.map((x) => `<li>${x}</li>`).join('')}</ul></div>
</div>
</div>
</section>
<section class="sec" id="kontakt">
<div class="wrap contact-grid">
<div>
<h2>${L('Gerät zur Reparatur anmelden', 'Book a repair')}</h2>
<p class="lead" style="margin-bottom:24px">${L('Schreiben Sie uns kurz, worum es geht. Wir melden uns mit dem nächsten Schritt, auf Wunsch holen wir das Gerät ab.', 'Tell us briefly what it is about. We will get back to you with the next step, and on request we pick the equipment up.')}</p>
${C.inquiryForm({ prefix: 'sv', topics: true, selected: 'werkstatt', submit: L('Nachricht senden', 'Send message') })}
</div>
<div class="visit-card">
<h3>${L('Direkt erreichen', 'Direct lines')}</h3>
<p class="muted">${L('Zentrale', 'Main number')} <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, ${L('oder direkt', 'or directly')}:</p>
${directNumbers(ctx, ['Service / Reparatur', 'Werkstatt Motorgeraete', 'Kaercher', 'Maehroboter'])}
</div>
</div>
</section>`;
  return page(ctx, {
    path: '/service.html',
    nav: 'service',
    title: L('Werkstatt und Service in Ostrhauderfehn | Wilken Poelker', 'Workshop and service in Ostrhauderfehn | Wilken Poelker'),
    description: L('Eigene Werkstätten in Ostrhauderfehn für E-Bikes, Motorgeräte, Kärcher und Mähroboter: Wartung, Reparatur, Ersatzteile sowie Hol- und Bringdienst.',
      'Our own workshops in Ostrhauderfehn for e-bikes, power tools, Kärcher and robotic mowers: maintenance, repair, spare parts and a pick-up and delivery service.'),
    ogImage: photo.large,
    smartBanner: true,
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── Über uns ──────────────────────────────────────────
async function about(ctx) {
  const photo = await ctx.images.photo('outdoor4');
  const trail = [HOME(), [L('Über uns', 'About us'), '/ueber-uns.html']];
  const total = ctx.team.reduce((n, d) => n + d.members.length, 0);
  const chips = [['#geschichte', 'Geschichte', 'History'], ['#team', 'Team', 'Team'], ['#standort', 'Standort', 'Location'], ['/karriere.html', 'Karriere', 'Careers']]
    .map(([h, de, en]) => `<a class="chip" href="${h}">${L(de, en)}</a>`).join('');
  const body = `
${phead({
    trail,
    title: L('Drei Generationen, ein Versprechen', 'Three generations, one promise'),
    lead: L('Seit über 75 Jahren steht der Name Wilken Poelker im südlichen Ostfriesland für ehrliche Beratung, gute Technik und einen Service, auf den man sich verlassen kann.',
      'For more than 75 years the name Wilken Poelker has stood for honest advice, good equipment and reliable service in southern East Frisia.'),
    photo,
    alt: L('Unser Geschäft mit der Teststrecke', 'Our shop with the test track'),
    extra: `<div class="chips" style="margin-top:22px">${chips}</div>`,
  })}
<section class="sec-tight" id="geschichte">
<div class="wrap split" style="align-items:start">
<div>
<h2>${L('Von der kleinen Werkstatt zum Fachhandel', 'From a small workshop to a specialist dealer')}</h2>
${L(`<p class="lead">Gegründet wurde das Unternehmen 1951 von Wilken Poelker, mit einer kleinen Werkstatt. Heute führt die dritte Generation den Familienbetrieb.</p>
<p>Geblieben ist, was von Anfang an zählte: mit Rat und Tat für die Kundinnen und Kunden da zu sein. Deshalb gehört zu jedem Verkauf ein starkes Werkstatt-Team, von der Inspektion über die Reparatur bis zur Versorgung mit Ersatzteilen. Und deshalb setzen wir auf Marken, deren Ersatzteile es auch in vielen Jahren noch gibt.</p>`,
    `<p class="lead">The company was founded in 1951 by Wilken Poelker, with a small workshop. Today the third generation runs the family business.</p>
<p>What mattered from the start still matters: being there for our customers with advice and help. That is why every sale comes with a strong workshop team, from inspections and repairs to spare parts. And that is why we choose brands whose spare parts will still be available for many years.</p>`)}
</div>
<ol class="timeline">
${L(`<li><b>1951</b><h3>Die Gründung</h3><p>Wilken Poelker eröffnet in Ostrhauderfehn eine kleine Werkstatt.</p></li>
<li><b>3 Generationen</b><h3>Ein Familienbetrieb wächst</h3><p>Aus der Werkstatt wird ein Fachhandel für E-Bikes und Fahrräder, Motorgeräte und Reinigungstechnik, bis heute in Familienhand.</p></li>
<li><b>2022</b><h3>FairCommerce</h3><p>Seit Februar 2022 sind wir Mitglied der Initiative FairCommerce des Händlerbundes.</p></li>
<li><b>Heute</b><h3>Einer der Großen im Norden</h3><p>Rund ${COMPANY.employees} Mitarbeiterinnen und Mitarbeiter, ${COMPANY.salesArea} Verkaufsfläche, ${COMPANY.testTrack} Teststrecke, QMF-zertifiziert und autorisierter Kärcher-Händler.</p></li>`,
    `<li><b>1951</b><h3>The beginning</h3><p>Wilken Poelker opens a small workshop in Ostrhauderfehn.</p></li>
<li><b>3 generations</b><h3>A family business grows</h3><p>The workshop becomes a specialist dealer for e-bikes and bicycles, power tools and cleaning equipment, still family-owned today.</p></li>
<li><b>2022</b><h3>FairCommerce</h3><p>Since February 2022 we have been a member of the FairCommerce initiative of the Händlerbund.</p></li>
<li><b>Today</b><h3>One of the large dealers in the north</h3><p>Around ${COMPANY.employees} employees, ${COMPANY.salesArea} of sales area, a ${COMPANY.testTrack} test track, QMF-certified and an authorised Kärcher dealer.</p></li>`)}
</ol>
</div>
</section>
<section class="sec band">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Was uns ausmacht', 'What makes us different')}</h2></div></div>
<div class="cards2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))">
<div class="card"><span class="card-ico">${icon('chat')}</span><h3>${L('Rat und Tat', 'Advice and help')}</h3><p>${L('Ehrliche Beratung statt Verkaufsdruck. Wir empfehlen, was zu Ihrem Bedarf passt.', 'Honest advice instead of sales pressure. We recommend what suits your needs.')}</p></div>
<div class="card"><span class="card-ico">${icon('heart')}</span><h3>${L('Familiäre Atmosphäre', 'Family atmosphere')}</h3><p>${L('Bei uns kennt man sich. Kurze Wege, persönliche Ansprechpartner, schnelle Hilfe.', 'We know each other here. Short distances, personal contacts, quick help.')}</p></div>
<div class="card"><span class="card-ico">${icon('shield')}</span><h3>${L('Langlebigkeit', 'Durability')}</h3><p>${L('Qualitätsmarken mit langfristiger Ersatzteilversorgung, damit sich Reparieren lohnt.', 'Quality brands with long-term spare parts supply, so that repairs are worthwhile.')}</p></div>
<div class="card"><span class="card-ico">${icon('award')}</span><h3>${L('Fachwissen', 'Expertise')}</h3><p>${L('Geschulte Verkäufer und ausgebildete Mechaniker für jede Gerätegruppe.', 'Trained sales staff and qualified mechanics for every type of equipment.')}</p></div>
</div>
</div>
</section>
<section class="sec" id="team">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Unser Team', 'Our team')}</h2><p>${L(`${plural(total, 'Mensch', 'Menschen')}, gegliedert in Fachbereiche: So haben Sie für jedes Anliegen den richtigen Ansprechpartner.`, `${plural(total, 'person', 'people')}, organised in specialist areas, so you have the right contact for every request.`)}</p></div><a class="link-more" href="/karriere.html">${L('Wir suchen Verstärkung', 'Join our team')}${icon('arrow-right')}</a></div>
${await teamList(ctx)}
</div>
</section>
<section class="sec band" id="standort">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Ostrhauderfehn, mitten im südlichen Ostfriesland', 'Ostrhauderfehn, in the heart of southern East Frisia')}</h2><p>${L('An der Langholter Straße erwartet Sie eine große Ausstellung mit eigenen Bereichen für Fahrräder und E-Bikes, Motorgeräte und Reinigungstechnik, dazu eine Teststrecke im Freien.', 'On Langholter Straße a large showroom awaits you, with separate areas for bicycles and e-bikes, power tools and cleaning equipment, plus an outdoor test track.')}</p></div></div>
<ul class="ticks" style="margin-bottom:24px">${L(`<li>${COMPANY.salesArea} Verkaufsfläche mit Showroom</li><li>${COMPANY.testTrack} Outdoor-Teststrecke</li><li>Werkstätten und Ersatzteillager im Haus</li>`,
    `<li>${COMPANY.salesArea} of sales area with showroom</li><li>${COMPANY.testTrack} outdoor test track</li><li>Workshops and spare parts stock on site</li>`)}</ul>
${await gallery(ctx, ['laden2', 'laden14', 'kaercher2', 'outdoor3', 'laden8', 'laden10', 'kaercher3', 'laden-outdoor', 'stihl-area', 'laden6'], L('Unser Geschäft in Ostrhauderfehn', 'Our shop in Ostrhauderfehn'))}
</div>
</section>
${C.visitSection(ctx, { heading: L('Lernen Sie uns kennen', 'Come and meet us'), text: L('Wir freuen uns auf Ihren Besuch in Ostrhauderfehn.', 'We look forward to your visit in Ostrhauderfehn.') })}`;
  return page(ctx, {
    path: '/ueber-uns.html',
    nav: 'ueber-uns',
    title: L('Über uns: Familienbetrieb seit 1951 | Wilken Poelker', 'About us: family business since 1951 | Wilken Poelker'),
    description: L('Seit 1951 Familienbetrieb in dritter Generation: rund 40 Mitarbeiterinnen und Mitarbeiter, 2.000 m² Ausstellung und 2.500 m² Teststrecke in Ostrhauderfehn.',
      'Family business since 1951, now in the third generation: around 40 employees, a 2,000 m² showroom and a 2,500 m² test track in Ostrhauderfehn, Germany.'),
    ogImage: photo.large,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.business(ctx)],
    body,
  });
}

// ── Karriere ──────────────────────────────────────────
async function career(ctx) {
  const photo = await ctx.images.photo('laden13');
  const trail = [HOME(), [L('Über uns', 'About us'), '/ueber-uns.html'], [L('Karriere', 'Careers'), '/karriere.html']];
  const apply = L('Bewerbung', 'Application');
  const body = `
${phead({
    trail,
    title: L('Werden Sie Teil unseres Teams', 'Become part of our team'),
    lead: L('Sie haben Freude an Technik und am Umgang mit Menschen? Wir suchen Verstärkung, in einem familiären Betrieb mit abwechslungsreichen Aufgaben.', 'Do you enjoy technology and working with people? We are looking for new colleagues, in a family business with varied tasks.'),
    photo,
    alt: L('Blick in unser Geschäft', 'A look inside our shop'),
  })}
<section class="sec-tight">
<div class="wrap">
<h2>${L('Aktuell suchen wir', 'Current vacancies')}</h2>
<div class="cards3">${txt().JOBS.map(([t, d]) => `<div class="card"><span class="card-ico">${icon('wrench')}</span><h3>${esc(t)}</h3><p>${esc(d)}</p><p style="margin:0"><a class="link-more" href="mailto:${COMPANY.email}?subject=${encodeURIComponent(`${apply}: ${t}`)}">${L('Jetzt bewerben', 'Apply now')}${icon('arrow-right')}</a></p></div>`).join('')}</div>
<p class="muted" style="margin-top:18px">${L('Wir bilden auch aus, zum Beispiel Zweiradmechatronikerinnen und Zweiradmechatroniker. Initiativbewerbungen sind jederzeit willkommen.', 'We also train apprentices, for example as bicycle mechatronics technicians. Speculative applications are always welcome.')}</p>
</div>
</section>
<section class="sec band">
<div class="wrap split">
<div>
<h2>${L('Was Sie bei uns erwartet', 'What to expect')}</h2>
<ul class="ticks">${L(`<li>Ein Familienbetrieb mit kurzen Wegen und persönlichen Ansprechpartnern</li><li>Qualitätsmarken und moderne Technik, von STIHL bis Kärcher</li><li>Ein Team aus rund ${COMPANY.employees} Kolleginnen und Kollegen in Verkauf, Werkstatt und Service</li><li>Abwechslungsreiche Aufgaben, vom Kundengespräch bis zur Reparatur</li>`,
    `<li>A family business with short distances and personal contacts</li><li>Quality brands and modern equipment, from STIHL to Kärcher</li><li>A team of around ${COMPANY.employees} colleagues in sales, workshop and service</li><li>Varied tasks, from customer conversations to repairs</li>`)}</ul>
</div>
<div class="card">
<h3>${L('So bewerben Sie sich', 'How to apply')}</h3>
<p>${L(`Melden Sie sich gern telefonisch unter <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a> oder per E-Mail an <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>. Ein paar Sätze zu Ihnen und Ihr Lebenslauf genügen für den Anfang.`,
    `Call us on <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a> or e-mail <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>. A few sentences about yourself and your CV are enough to start with.`)}</p>
<div class="btns"><a class="btn" href="mailto:${COMPANY.email}?subject=${encodeURIComponent(apply)}">${icon('mail')}${L('Bewerbung per E-Mail', 'Apply by e-mail')}</a></div>
</div>
</div>
</section>`;
  return page(ctx, {
    path: '/karriere.html',
    nav: 'ueber-uns',
    title: L('Karriere und Stellenangebote in Ostrhauderfehn | Wilken Poelker', 'Careers and vacancies in Ostrhauderfehn | Wilken Poelker'),
    description: L('Jobs bei Wilken Poelker in Ostrhauderfehn: Verkäufer Motorgeräte, Motorgerätemechaniker und Zweiradmechaniker (m/w/d) im Familienbetrieb seit 1951.',
      'Jobs at Wilken Poelker in Ostrhauderfehn: sales assistant for power tools, power tool mechanic and bicycle mechanic (m/f/d) in a family business since 1951.'),
    ogImage: photo.large,
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── App ───────────────────────────────────────────────
function app(ctx) {
  const trail = [HOME(), ['App', '/app.html']];
  const list = isEn() ? [
    ['Do I need an account for this website?', 'No. There is no login on this website. You manage your customer account with repairs, appointments and chat in the app only.'],
    ['I have not received a confirmation e-mail.', 'Please also check your spam folder. If no e-mail arrives, get in touch with us and we will help you.'],
    ['My customer number was not recognised.', 'The automatic match only works if your name and address match our customer records. Otherwise you can request the link in the app. We check it and activate your account.'],
    ['I do not get push notifications.', 'Allow notifications for the app in your phone’s settings. On some devices you also have to switch off battery optimisation for the app.'],
    ['Forgot your password?', 'Tap “Forgot password?” on the app’s login screen. You will then receive an e-mail to reset it.'],
    ['How do I delete my account?', `In the app under “Settings” and “Delete my data”, or send us an e-mail to ${COMPANY.email}. Your account and your data will then be deleted.`],
  ] : [
    ['Brauche ich für diese Website ein Konto?', 'Nein. Auf dieser Website gibt es keine Anmeldung. Ihr Kundenkonto mit Reparaturen, Terminen und Chat führen Sie ausschließlich in der App.'],
    ['Ich habe keine Bestätigungs-E-Mail erhalten.', 'Bitte prüfen Sie auch Ihren Spam-Ordner. Kommt keine E-Mail an, melden Sie sich bei uns, wir helfen Ihnen weiter.'],
    ['Meine Kundennummer wurde nicht erkannt.', 'Die automatische Zuordnung klappt nur, wenn Name und Anschrift mit unseren Kundendaten übereinstimmen. Andernfalls können Sie in der App eine Zuordnung beantragen. Wir prüfen das und schalten Sie frei.'],
    ['Ich bekomme keine Push-Benachrichtigungen.', 'Erlauben Sie Benachrichtigungen für die App in den Einstellungen Ihres Telefons. Auf manchen Geräten muss zusätzlich die Akku-Optimierung für die App deaktiviert werden.'],
    ['Passwort vergessen?', 'Tippen Sie auf dem Anmeldebildschirm der App auf „Passwort vergessen?“. Sie erhalten dann eine E-Mail zum Zurücksetzen.'],
    ['Wie lösche ich mein Konto?', `In der App unter „Einstellungen“ und „Meine Daten löschen“, oder Sie schreiben uns eine E-Mail an ${COMPANY.email}. Ihr Konto und Ihre Daten werden dann gelöscht.`],
  ];
  const steps = isEn()
    ? '<li><h3>Install the app</h3><p>Free of charge in the App Store for iPhone and on Google Play for Android.</p></li><li><h3>Register</h3><p>Register with your name, address and e-mail address and confirm the e-mail.</p></li><li><h3>Link your customer number</h3><p>As an existing customer you are usually recognised automatically, otherwise you request the link in the app. After that you can see your repairs and request appointments.</p></li>'
    : '<li><h3>App installieren</h3><p>Kostenlos im App Store für iPhone und bei Google Play für Android.</p></li><li><h3>Registrieren</h3><p>Mit Name, Adresse und E-Mail-Adresse registrieren und die E-Mail bestätigen.</p></li><li><h3>Kundennummer verknüpfen</h3><p>Als Bestandskunde werden Sie meist automatisch erkannt, sonst fragen Sie die Zuordnung in der App an. Danach sehen Sie Ihre Reparaturen und können Termine anfragen.</p></li>';
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${L('Wilken Poelker in der Hosentasche', 'Wilken Poelker in your pocket')}</h1>
<p class="lead">${L('Mit unserer kostenlosen App behalten Sie Ihre Reparaturen im Blick, fragen Termine an, stellen Service-Anfragen mit Foto und chatten direkt mit unserem Team.', 'With our free app you keep track of your repairs, request appointments, send service requests with a photo and chat directly with our team.')}</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">${C.appBand({ heading: L('Was die App für Sie erledigt', 'What the app does for you') })}</div></section>
<section class="sec">
<div class="wrap">
<h2>${L('In drei Schritten startklar', 'Ready in three steps')}</h2>
<ol class="steps" style="grid-template-columns:repeat(3,minmax(0,1fr))">${steps}</ol>
<ul class="ticks" style="margin-top:28px">${L('<li>Für unsere Kundinnen und Kunden kostenlos</li><li>Hell- und Dunkelmodus sowie anpassbare Schriftgröße</li><li>Auf Deutsch und Englisch</li><li>Ihre Daten können Sie in den Einstellungen jederzeit exportieren</li>',
    '<li>Free of charge for our customers</li><li>Light and dark mode and adjustable text size</li><li>In German and English</li><li>You can export your data in the settings at any time</li>')}</ul>
</div>
</section>
<section class="sec band" id="support">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Hilfe und Support', 'Help and support')}</h2><p>${L(`Wir helfen Ihnen gern weiter, bei Problemen mit der Anmeldung, der Kundennummer oder Benachrichtigungen: Telefon <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, E-Mail <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.`,
    `We are happy to help with problems with logging in, your customer number or notifications: phone <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, e-mail <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.`)}</p></div></div>
${C.faqBlock(list)}
<p class="muted" style="margin-top:22px">${L('Die Datenschutzhinweise zur App finden Sie in der App unter „Mehr“ und „Datenschutz“. Fragen zum Datenschutz beantwortet unser Datenschutzbeauftragter unter <a href="mailto:datenschutz@wilkenpoelker.de">datenschutz@wilkenpoelker.de</a>.',
    'You will find the app’s privacy information in the app under “More” and “Privacy Policy”. Our data protection officer answers questions about data protection at <a href="mailto:datenschutz@wilkenpoelker.de">datenschutz@wilkenpoelker.de</a>.')}</p>
</div>
</section>`;
  return page(ctx, {
    path: '/app.html',
    nav: 'app',
    title: L('Die Wilken-Poelker-App: Reparaturstatus, Termine, Chat', 'The Wilken Poelker app: repair status, appointments, chat'),
    description: L('Die kostenlose Wilken-Poelker-App für iPhone und Android: Reparaturstatus mit Push-Nachricht, Termine anfragen, Service-Chat mit Foto und Neuigkeiten.',
      'The free Wilken Poelker app for iPhone and Android: repair status with push notifications, appointment requests, service chat with photos and news.'),
    ogImage: '/assets/img/app/start-720.webp',
    smartBanner: true,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.faqPage(list), {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'Wilken Poelker',
      operatingSystem: 'iOS, Android',
      applicationCategory: 'BusinessApplication',
      inLanguage: ['de', 'en'],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      publisher: { '@id': seo.businessId(ctx) },
      downloadUrl: [COMPANY.appStore, COMPANY.playStore],
    }],
    body,
  });
}

// ── Kontakt ───────────────────────────────────────────
function contact(ctx) {
  const trail = [HOME(), [L('Kontakt', 'Contact'), '/kontakt.html']];
  const faqList = txt().faqs(C.hoursText(ctx));
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>${L('Kontakt und Anfahrt', 'Contact and directions')}</h1>
<p class="lead">${L('Rufen Sie uns an, schreiben Sie uns oder kommen Sie vorbei. Ihre Nachricht landet direkt bei der zuständigen Abteilung.', 'Call us, write to us or drop by. Your message goes straight to the right department. You are welcome to write in English.')}</p>
<div class="btns" style="margin-top:22px"><a class="btn" href="${COMPANY.phoneHref}">${icon('phone')}${COMPANY.phone}</a><a class="btn btn-quiet" href="mailto:${COMPANY.email}">${icon('mail')}${COMPANY.email}</a><a class="btn btn-quiet" href="${MAPS.route}" target="_blank" rel="noopener">${icon('route')}${L('Route planen', 'Get directions')}</a></div>
</div>
</section>
<section class="sec-tight" id="kontakt-formular">
<div class="wrap contact-grid">
<div class="prose-card">
<h2 style="font-size:1.6rem">${L('Schreiben Sie uns', 'Write to us')}</h2>
${C.inquiryForm({ prefix: 'ct', topics: true, submit: L('Nachricht senden', 'Send message') })}
</div>
<div class="visit-card">
<h3>${L('Direkte Durchwahl', 'Direct lines')}</h3>
<p class="muted">${L('Zentrale', 'Main number')} <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, Fax ${COMPANY.fax}</p>
${directNumbers(ctx)}
</div>
</div>
</section>
${C.visitSection(ctx, {
    heading: L('Öffnungszeiten und Anfahrt', 'Opening hours and directions'),
    text: L('Mitten im südlichen Ostfriesland, an der Langholter Straße in Ostrhauderfehn, gut erreichbar aus Rhauderfehn, Westoverledingen, Leer, Papenburg und dem Saterland.',
      'In the heart of southern East Frisia, on Langholter Straße in Ostrhauderfehn, easy to reach from Rhauderfehn, Westoverledingen, Leer, Papenburg and the Saterland.'),
    id: 'anfahrt',
    band: true,
  })}
<section class="sec">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Gut zu wissen', 'Good to know')}</h2></div></div>
${C.faqBlock(faqList)}
</div>
</section>`;
  return page(ctx, {
    path: '/kontakt.html',
    nav: 'kontakt',
    title: L('Kontakt, Öffnungszeiten und Anfahrt | Wilken Poelker', 'Contact, opening hours and directions | Wilken Poelker'),
    description: L(`Wilken Poelker, ${COMPANY.street}, ${COMPANY.zip} ${COMPANY.city}. Telefon ${COMPANY.phone}. Öffnungszeiten, Anfahrt, direkte Durchwahlen und Kontaktformular.`,
      `Wilken Poelker, ${COMPANY.street}, ${COMPANY.zip} ${COMPANY.city}, Germany. Phone ${COMPANY.phone}. Opening hours, directions, direct lines and contact form.`),
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.business(ctx), seo.faqPage(faqList)],
    body,
  });
}

module.exports = { bikes, leasing, service, about, career, app, contact };
