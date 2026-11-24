// Company pages: bikes, leasing, service, about us, career, app, contact
const { esc, plural } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const {
  COMPANY, MAPS, SERVICES, WORKSHOPS, REPAIR_STEPS, LEASING_PARTNERS, LEASING_STEPS, QMF_ITEMS, KAERCHER_ITEMS, JOBS, faqs,
} = require('../content');
const seo = require('../seo');
const { recommended } = require('./catalog');

const DEP_TEXT = {
  Geschaeftsfuehrung: 'Familienbetrieb in dritter Generation',
  Buchhaltung: 'Rechnungen, Garantiefälle und Verwaltung',
  'Service / Reparatur': 'Ihr erster Kontakt bei Reparaturen und Ersatzteilen',
  'Verkauf E-Bikes': 'Beratung, Probefahrt und Leasing',
  'Verkauf Motorgeraete / Kaercher': 'Garten-, Forst- und Reinigungstechnik',
  'Werkstatt Zweirad': 'Zweiradmechatroniker und Zweiradmechanikermeisterin',
  'Werkstatt Motorgeraete': 'Wartung und Reparatur unter eigener Leitung',
  Maehroboter: 'Beratung und Betreuung durch Experten',
  Kaercher: 'Kärcher-Werkstatt mit Monteur im Außendienst',
  Hausmeister: 'Damit im Haus alles läuft',
};

const telHref = (n) => `tel:+49${String(n).replace(/\D/g, '').replace(/^0/, '')}`;
const telText = (n) => String(n).replace('/', ' ');
const initials = (name) => String(name).split(/\s+/).filter(Boolean).map((w) => w[0]).filter((ch, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();

async function member(ctx, m) {
  const p = await ctx.images.portrait(m.image);
  return `<li><div class="ph">${p ? `<img src="${p.src}" alt="${esc(m.name)}" width="360" height="360" loading="lazy">` : `<span class="ini" aria-hidden="true">${esc(initials(m.name))}</span>`}</div><div class="tx"><b>${esc(m.name)}</b><span>${esc(m.position || '')}</span>${m.phone ? `<a href="${telHref(m.phone)}">${esc(telText(m.phone))}</a>` : ''}</div></li>`;
}

async function teamList(ctx, keys) {
  const out = [];
  for (const dep of ctx.team) {
    if (keys && !keys.includes(dep.key)) continue;
    const items = [];
    for (const m of dep.members) items.push(await member(ctx, m));
    out.push(`<div class="team-dep"><h3>${esc(dep.label)}</h3>${DEP_TEXT[dep.key] ? `<p class="muted" style="margin:-6px 0 14px">${esc(DEP_TEXT[dep.key])}</p>` : ''}<ul class="team">${items.join('')}</ul></div>`);
  }
  return out.join('');
}

// Direct numbers of the departments (from the team list of the app)
function directNumbers(ctx, keys) {
  const rows = [];
  for (const dep of ctx.team) {
    if (keys && !keys.includes(dep.key)) continue;
    for (const m of dep.members) if (m.phone) rows.push(`<li><span>${esc(m.position || dep.label)}<br><small class="muted">${esc(m.name)}</small></span><a href="${telHref(m.phone)}">${esc(telText(m.phone))}</a></li>`);
  }
  return rows.length ? `<ul class="direct">${rows.join('')}</ul>` : '';
}

async function gallery(ctx, names, alt) {
  const items = [];
  for (const n of names) {
    const ph = await ctx.images.photo(n);
    items.push(`<button type="button" data-zoom="${ph.large}" aria-label="Foto vergrößern">${C.photoImg(ph, { alt, sizes: '(max-width: 760px) 50vw, 25vw' })}</button>`);
  }
  return `<div class="gallery" data-gallery>${items.join('')}</div>
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Foto"><button class="icon-btn" type="button" data-lb-close aria-label="Schließen">${icon('close')}</button><button class="icon-btn nav-b prev" type="button" data-lb-prev aria-label="Vorheriges Foto">${icon('chevron-left')}</button><img alt="${esc(alt)}"><button class="icon-btn nav-b next" type="button" data-lb-next aria-label="Nächstes Foto">${icon('chevron-right')}</button></div>`;
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
  const trail = [['Start', '/'], ['Fahrräder und E-Bikes', '/fahrraeder.html']];
  const fromStock = ctx.products.filter((p) => p.main === 'Fahrräder').sort(recommended);
  const cat = ctx.categories.find((c) => c.name === 'Fahrräder');
  const body = `
${phead({
    trail,
    title: 'Fahrräder und E-Bikes',
    lead: `Vom Kinderrad bis zum E-Bike: In unserer Fahrradausstellung vergleichen Sie in Ruhe und fahren auf unserer ${COMPANY.testTrack} großen Teststrecke Probe. Im Fahrradkatalog sehen Sie unser Sortiment mit Ausstattung, Größen und Verfügbarkeit.`,
    photo,
    alt: 'Fahrradausstellung bei Wilken Poelker',
    extra: `<div class="chips" style="margin-top:22px"><a class="chip" href="#katalog">Fahrradkatalog</a><a class="chip" href="/e-bike-leasing.html">E-Bike-Leasing</a><a class="chip" href="/service.html#zweirad">Zweiradwerkstatt</a>${cat ? `<a class="chip" href="${cat.url}">E-Bikes aus unserem Bestand</a>` : ''}</div>`,
  })}
<section class="sec-tight" id="katalog">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Fahrradkatalog</h2><p>E-Bikes, Trekking-, City- und Kinderräder mit Ausstattung, Größen und Verfügbarkeit. Ihr Wunschrad können Sie unverbindlich reservieren und bei uns Probe fahren.</p></div></div>
<div class="card" id="bike-gate">
<h3>Fahrradkatalog anzeigen</h3>
<p>Unser Fahrradkatalog wird von der <b>BIDEX GmbH</b> (Ennepetal) bereitgestellt. Erst wenn Sie auf „Katalog laden“ klicken, werden Inhalte von deren Servern geladen. Dabei werden Ihre IP-Adresse und technische Daten an BIDEX und deren Dienstleister übertragen, und im Speicher Ihres Browsers wird Ihre letzte Ansicht gespeichert. In der Detailansicht eines Rades können außerdem ein Ratenkauf-Rechner (easyCredit, TeamBank AG) und eine Größenberatung (Smartfit, Radlabor GmbH) geladen werden. Mehr dazu in unserer <a href="/datenschutz.html#fahrradkatalog">Datenschutzerklärung</a>. Ihre Einwilligung können Sie jederzeit widerrufen.</p>
<label class="check"><input type="checkbox" id="bike-remember"> Auswahl für diesen Browser merken</label>
<div class="btns" style="margin-top:16px"><button type="button" class="btn" id="bike-load">${icon('bike')}Katalog laden</button><a class="btn btn-quiet" href="${COMPANY.phoneHref}">${icon('phone')}Lieber anrufen: ${COMPANY.phone}</a></div>
</div>
<div id="BidexCatalog"></div>
<p id="bike-revoke" class="note" hidden>Der Fahrradkatalog wird von der BIDEX GmbH bereitgestellt. <a href="#" id="bike-revoke-link">Einwilligung widerrufen und Katalog ausblenden</a></p>
</div>
</section>
${fromStock.length ? `<section class="sec band"><div class="wrap">
<div class="sec-head"><div class="head-text"><h2>E-Bikes aus unserem Bestand</h2><p>Mit Preis und Verfügbarkeit aus unserer Warenwirtschaft.</p></div>${cat ? `<a class="link-more" href="${cat.url}">Alle ansehen${icon('arrow-right')}</a>` : ''}</div>
<div class="rail">${fromStock.slice(0, 12).map((p) => C.productCard(p, ctx.productImages.get(p.slug)?.[0])).join('')}</div>
</div></section>` : ''}
<section class="sec">
<div class="wrap">
<div class="cards3">
<div class="card"><span class="card-ico">${icon('route')}</span><h3>Beratung und Probefahrt</h3><p>Wir finden das passende Rad für Ihren Alltag, und Sie testen es auf unserer ${COMPANY.testTrack} großen Teststrecke.</p></div>
<div class="card"><span class="card-ico">${icon('euro')}</span><h3>E-Bike-Leasing</h3><p>Über ${LEASING_PARTNERS.join(', ')}. <a href="/e-bike-leasing.html">So funktioniert es</a></p></div>
<div class="card"><span class="card-ico">${icon('wrench')}</span><h3>Zweiradwerkstatt</h3><p>Inspektion, Reparatur und E-Bike-Service durch unsere Zweiradmechatroniker und eine Zweiradmechanikermeisterin.</p></div>
</div>
</div>
</section>
<section class="sec band">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Unsere Fahrradausstellung</h2><p>Kinderräder, E-Bikes, Lastenräder, Dreiräder, Helme und Zubehör.</p></div></div>
${await gallery(ctx, ['showroom1', 'showroom2', 'outdoor2', 'outdoor1', 'bikes-area', 'showroom3'], 'Fahrradausstellung bei Wilken Poelker')}
</div>
</section>
<section class="sec">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Ihre Ansprechpartner</h2><p>Unser Team aus Verkauf und Zweiradwerkstatt.</p></div></div>
${await teamList(ctx, ['Verkauf E-Bikes', 'Werkstatt Zweirad'])}
</div>
</section>`;
  return page(ctx, {
    path: '/fahrraeder.html',
    nav: 'fahrraeder',
    title: 'Fahrräder und E-Bikes in Ostrhauderfehn | Wilken Poelker',
    description: 'E-Bikes und Fahrräder in Ostrhauderfehn: Fahrradkatalog mit Verfügbarkeit, Probefahrt auf 2.500\u00a0m² Teststrecke, E-Bike-Leasing und eigene Zweiradwerkstatt.',
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
  const trail = [['Start', '/'], ['Fahrräder', '/fahrraeder.html'], ['E-Bike-Leasing', '/e-bike-leasing.html']];
  const list = [
    ['Wie läuft Dienstrad-Leasing ab?', 'Sie klären mit Ihrem Arbeitgeber, über welchen Anbieter geleast wird, suchen Ihr Rad bei uns aus und fahren Probe. Die Abwicklung läuft über Ihren Arbeitgeber und den Leasing-Anbieter, wir übergeben das Rad fahrbereit und übernehmen Inspektion und Reparatur.'],
    ['Mit welchen Leasing-Anbietern arbeiten Sie zusammen?', `Mit ${LEASING_PARTNERS.join(', ')}.`],
    ['Wo erfahre ich die Konditionen?', 'Informationen zu Konditionen erhalten Sie bei Ihrem Arbeitgeber oder direkt beim jeweiligen Leasing-Anbieter.'],
  ];
  const body = `
${phead({ trail, title: 'E-Bike-Leasing: Ihr Dienstrad vom Fachhändler', lead: 'Viele Arbeitgeber bieten ihren Beschäftigten ein Dienstrad-Leasing an. Wir arbeiten mit fünf großen Leasing-Anbietern zusammen. So suchen Sie Ihr Wunschrad bei uns aus, fahren es Probe und lassen es später bei uns warten.', photo, alt: 'E-Bikes in unserer Ausstellung' })}
<section class="sec-tight">
<div class="wrap">
<h2>So funktioniert es</h2>
<ol class="steps" style="grid-template-columns:repeat(4,minmax(0,1fr))">${LEASING_STEPS.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
</div>
</section>
<section class="sec band">
<div class="wrap split">
<div>
<h2>Unsere Leasing-Partner</h2>
<p class="lead">Fragen Sie bei Ihrem Arbeitgeber nach, welcher Anbieter genutzt wird. Wir beraten Sie gern.</p>
<div class="partners" style="margin-top:20px">${LEASING_PARTNERS.map((p) => `<span>${esc(p)}</span>`).join('')}</div>
</div>
<div class="card">
<h3>Ihre Vorteile bei uns</h3>
<ul class="ticks"><li>Große Auswahl an E-Bikes und Fahrrädern</li><li>Probefahrt auf ${COMPANY.testTrack} Teststrecke</li><li>Übergabe fahrbereit, mit Einweisung</li><li>Inspektion und Reparatur in der eigenen Zweiradwerkstatt</li></ul>
<div class="btns" style="margin-top:20px"><a class="btn" href="/kontakt.html?thema=fahrrad">${icon('mail')}Beratung anfragen</a><a class="btn btn-quiet" href="/fahrraeder.html#katalog">${icon('bike')}Fahrradkatalog</a></div>
</div>
</div>
</section>
<section class="sec"><div class="wrap"><h2>Häufige Fragen zum Leasing</h2>${C.faqBlock(list)}</div></section>`;
  return page(ctx, {
    path: '/e-bike-leasing.html',
    nav: 'fahrraeder',
    title: 'E-Bike-Leasing mit JobRad, Lease a Bike und mehr | Wilken Poelker',
    description: 'Dienstrad-Leasing in Ostrhauderfehn mit JobRad, Lease a Bike, Bikeleasing, Businessbike und Eurorad / AGL. Beratung, Probefahrt und Service vom Fachhändler.',
    ogImage: photo.large,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.faqPage(list)],
    body,
  });
}

// ── Werkstatt und Service ─────────────────────────────
async function service(ctx) {
  const photo = await ctx.images.photo('laden10');
  const trail = [['Start', '/'], ['Werkstatt und Service', '/service.html']];
  const shops = [];
  for (const w of WORKSHOPS) {
    const faces = [];
    for (const dep of ctx.team.filter((d) => w.departments.includes(d.key))) {
      for (const m of dep.members) {
        const p = await ctx.images.portrait(m.image);
        if (p) faces.push(`<li><img src="${p.small}" alt="${esc(m.name)}" title="${esc(m.name)}, ${esc(m.position)}" width="128" height="128" loading="lazy"></li>`);
      }
    }
    shops.push(`<div class="card" id="${w.id}"><span class="card-ico">${icon(w.icon)}</span><h3>${w.title}</h3><p>${w.text}</p><ul class="ticks">${w.points.map((x) => `<li>${x}</li>`).join('')}</ul>${faces.length ? `<ul class="faces" style="grid-template-columns:repeat(auto-fill,minmax(44px,1fr));margin-top:18px">${faces.slice(0, 8).join('')}</ul>` : ''}</div>`);
  }
  const body = `
${phead({ trail, title: 'Werkstatt und Service', lead: 'Service, der nach dem Kauf erst richtig anfängt: Beratung, Übergabe, Einweisung, Wartung, Reparatur und Ersatzteile, alles aus einer Hand und unter einem Dach in Ostrhauderfehn.', photo, alt: 'Blick in unser Geschäft', extra: `<div class="chips" style="margin-top:22px"><a class="chip" href="#werkstaetten">Werkstätten</a><a class="chip" href="#ablauf">Reparatur-Ablauf</a><a class="chip" href="#leistungen">Leistungen</a><a class="chip" href="#zertifikate">QMF und Kärcher</a><a class="chip" href="#kontakt">Gerät anmelden</a></div>` })}
<section class="sec-tight" id="werkstaetten">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Vier Fachbereiche, ein Team</h2><p>Für jede Gerätegruppe gibt es bei uns Spezialisten: ausgebildete Zweiradmechatroniker, Motorgeräte-Mechaniker, Kärcher-Techniker und Mähroboter-Experten.</p></div></div>
<div class="cards2">${shops.join('')}</div>
</div>
</section>
<section class="sec band" id="ablauf">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>So läuft Ihre Reparatur</h2><p>Transparent von der Annahme bis zur Abholung. Mit unserer App sehen Sie jeden Schritt auf dem Handy.</p></div><a class="link-more" href="/app.html">Zur App${icon('arrow-right')}</a></div>
<ol class="steps">${REPAIR_STEPS.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
</div>
</section>
<section class="sec" id="leistungen">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Alles, was dazugehört</h2><p>Vom ersten Gespräch bis zur zehnten Inspektion.</p></div></div>
<ul class="svc">${SERVICES.map(([ic, t, d]) => `<li><span class="ico">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ul>
</div>
</section>
<section class="sec band" id="zertifikate">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Zertifiziert und autorisiert</h2></div></div>
<div class="cards2">
<div class="card"><img src="/assets/img/qmf.webp" alt="QMF – Qualität mit Fachbetrieb" width="260" height="137" loading="lazy" style="height:64px;width:auto;margin-bottom:14px;border-radius:8px"><h3>QMF: Qualität mit Fachbetrieb</h3><p>QMF ist eine Qualifizierungsinitiative der Fachverbände des Landmaschinen- und Motorgerätehandwerks. Zertifizierte Betriebe zeichnen sich durch besondere Servicequalität und Fachkompetenz aus, erfüllen strenge Kriterien und werden regelmäßig überprüft. Wir sind QMF-zertifiziert für:</p><ul class="ticks">${QMF_ITEMS.map((x) => `<li>${x}</li>`).join('')}</ul></div>
<div class="card"><img src="/assets/img/kaercher-haendler.png" alt="Kärcher" width="480" height="119" loading="lazy" style="height:44px;width:auto;margin:10px 0 24px"><h3>Autorisierter Kärcher-Händler</h3><p>Wir vertreiben die gesamte Palette des weltweit führenden Anbieters von Reinigungssystemen und bieten den passenden Service dazu: eigene Kärcher-Werkstatt, Monteur im Außendienst und Beratung für Privat und Gewerbe.</p><ul class="ticks">${KAERCHER_ITEMS.map((x) => `<li>${x}</li>`).join('')}</ul></div>
</div>
</div>
</section>
<section class="sec" id="kontakt">
<div class="wrap contact-grid">
<div>
<h2>Gerät zur Reparatur anmelden</h2>
<p class="lead" style="margin-bottom:24px">Schreiben Sie uns kurz, worum es geht. Wir melden uns mit dem nächsten Schritt, auf Wunsch holen wir das Gerät ab.</p>
${C.inquiryForm({ prefix: 'sv', topics: true, selected: 'werkstatt', submit: 'Nachricht senden' })}
</div>
<div class="visit-card">
<h3>Direkt erreichen</h3>
<p class="muted">Zentrale <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, oder direkt:</p>
${directNumbers(ctx, ['Service / Reparatur', 'Werkstatt Motorgeraete', 'Kaercher', 'Maehroboter'])}
</div>
</div>
</section>`;
  return page(ctx, {
    path: '/service.html',
    nav: 'service',
    title: 'Werkstatt und Service in Ostrhauderfehn | Wilken Poelker',
    description: 'Eigene Werkstätten in Ostrhauderfehn für E-Bikes, Motorgeräte, Kärcher und Mähroboter: Wartung, Reparatur, Ersatzteile sowie Hol- und Bringdienst.',
    ogImage: photo.large,
    smartBanner: true,
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── Über uns ──────────────────────────────────────────
async function about(ctx) {
  const photo = await ctx.images.photo('outdoor4');
  const trail = [['Start', '/'], ['Über uns', '/ueber-uns.html']];
  const total = ctx.team.reduce((n, d) => n + d.members.length, 0);
  const body = `
${phead({ trail, title: 'Drei Generationen, ein Versprechen', lead: 'Seit über 75 Jahren steht der Name Wilken Poelker im südlichen Ostfriesland für ehrliche Beratung, gute Technik und einen Service, auf den man sich verlassen kann.', photo, alt: 'Unser Geschäft mit der Teststrecke', extra: '<div class="chips" style="margin-top:22px"><a class="chip" href="#geschichte">Geschichte</a><a class="chip" href="#team">Team</a><a class="chip" href="#standort">Standort</a><a class="chip" href="/karriere.html">Karriere</a></div>' })}
<section class="sec-tight" id="geschichte">
<div class="wrap split" style="align-items:start">
<div>
<h2>Von der kleinen Werkstatt zum Fachhandel</h2>
<p class="lead">Gegründet wurde das Unternehmen 1951 von Wilken Poelker, mit einer kleinen Werkstatt. Heute führt die dritte Generation den Familienbetrieb.</p>
<p>Geblieben ist, was von Anfang an zählte: mit Rat und Tat für die Kundinnen und Kunden da zu sein. Deshalb gehört zu jedem Verkauf ein starkes Werkstatt-Team, von der Inspektion über die Reparatur bis zur Versorgung mit Ersatzteilen. Und deshalb setzen wir auf Marken, deren Ersatzteile es auch in vielen Jahren noch gibt.</p>
</div>
<ol class="timeline">
<li><b>1951</b><h3>Die Gründung</h3><p>Wilken Poelker eröffnet in Ostrhauderfehn eine kleine Werkstatt.</p></li>
<li><b>3 Generationen</b><h3>Ein Familienbetrieb wächst</h3><p>Aus der Werkstatt wird ein Fachhandel für E-Bikes und Fahrräder, Motorgeräte und Reinigungstechnik, bis heute in Familienhand.</p></li>
<li><b>2022</b><h3>FairCommerce</h3><p>Seit Februar 2022 sind wir Mitglied der Initiative FairCommerce des Händlerbundes.</p></li>
<li><b>Heute</b><h3>Einer der Großen im Norden</h3><p>Rund ${COMPANY.employees} Mitarbeiterinnen und Mitarbeiter, ${COMPANY.salesArea} Verkaufsfläche, ${COMPANY.testTrack} Teststrecke, QMF-zertifiziert und autorisierter Kärcher-Händler.</p></li>
</ol>
</div>
</section>
<section class="sec band">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Was uns ausmacht</h2></div></div>
<div class="cards2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))">
<div class="card"><span class="card-ico">${icon('chat')}</span><h3>Rat und Tat</h3><p>Ehrliche Beratung statt Verkaufsdruck. Wir empfehlen, was zu Ihrem Bedarf passt.</p></div>
<div class="card"><span class="card-ico">${icon('heart')}</span><h3>Familiäre Atmosphäre</h3><p>Bei uns kennt man sich. Kurze Wege, persönliche Ansprechpartner, schnelle Hilfe.</p></div>
<div class="card"><span class="card-ico">${icon('shield')}</span><h3>Langlebigkeit</h3><p>Qualitätsmarken mit langfristiger Ersatzteilversorgung, damit sich Reparieren lohnt.</p></div>
<div class="card"><span class="card-ico">${icon('award')}</span><h3>Fachwissen</h3><p>Geschulte Verkäufer und ausgebildete Mechaniker für jede Gerätegruppe.</p></div>
</div>
</div>
</section>
<section class="sec" id="team">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Unser Team</h2><p>${plural(total, 'Mensch', 'Menschen')}, gegliedert in Fachbereiche: So haben Sie für jedes Anliegen den richtigen Ansprechpartner.</p></div><a class="link-more" href="/karriere.html">Wir suchen Verstärkung${icon('arrow-right')}</a></div>
${await teamList(ctx)}
</div>
</section>
<section class="sec band" id="standort">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Ostrhauderfehn, mitten im südlichen Ostfriesland</h2><p>An der Langholter Straße erwartet Sie eine große Ausstellung mit eigenen Bereichen für Fahrräder und E-Bikes, Motorgeräte und Reinigungstechnik, dazu eine Teststrecke im Freien.</p></div></div>
<ul class="ticks" style="margin-bottom:24px"><li>${COMPANY.salesArea} Verkaufsfläche mit Showroom</li><li>${COMPANY.testTrack} Outdoor-Teststrecke</li><li>Werkstätten und Ersatzteillager im Haus</li></ul>
${await gallery(ctx, ['laden2', 'laden14', 'kaercher2', 'outdoor3', 'laden8', 'laden10', 'kaercher3', 'laden-outdoor', 'stihl-area', 'laden6'], 'Unser Geschäft in Ostrhauderfehn')}
</div>
</section>
${C.visitSection(ctx, { heading: 'Lernen Sie uns kennen', text: 'Wir freuen uns auf Ihren Besuch in Ostrhauderfehn.' })}`;
  return page(ctx, {
    path: '/ueber-uns.html',
    nav: 'ueber-uns',
    title: 'Über uns: Familienbetrieb seit 1951 | Wilken Poelker',
    description: 'Seit 1951 Familienbetrieb in dritter Generation: rund 40 Mitarbeiterinnen und Mitarbeiter, 2.000\u00a0m² Ausstellung und 2.500\u00a0m² Teststrecke in Ostrhauderfehn.',
    ogImage: photo.large,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.business(ctx)],
    body,
  });
}

// ── Karriere ──────────────────────────────────────────
async function career(ctx) {
  const photo = await ctx.images.photo('laden13');
  const trail = [['Start', '/'], ['Über uns', '/ueber-uns.html'], ['Karriere', '/karriere.html']];
  const body = `
${phead({ trail, title: 'Werden Sie Teil unseres Teams', lead: 'Sie haben Freude an Technik und am Umgang mit Menschen? Wir suchen Verstärkung, in einem familiären Betrieb mit abwechslungsreichen Aufgaben.', photo, alt: 'Blick in unser Geschäft' })}
<section class="sec-tight">
<div class="wrap">
<h2>Aktuell suchen wir</h2>
<div class="cards3">${JOBS.map(([t, d]) => `<div class="card"><span class="card-ico">${icon('wrench')}</span><h3>${esc(t)}</h3><p>${esc(d)}</p><p style="margin:0"><a class="link-more" href="mailto:${COMPANY.email}?subject=${encodeURIComponent(`Bewerbung: ${t}`)}">Jetzt bewerben${icon('arrow-right')}</a></p></div>`).join('')}</div>
<p class="muted" style="margin-top:18px">Wir bilden auch aus, zum Beispiel Zweiradmechatronikerinnen und Zweiradmechatroniker. Initiativbewerbungen sind jederzeit willkommen.</p>
</div>
</section>
<section class="sec band">
<div class="wrap split">
<div>
<h2>Was Sie bei uns erwartet</h2>
<ul class="ticks"><li>Ein Familienbetrieb mit kurzen Wegen und persönlichen Ansprechpartnern</li><li>Qualitätsmarken und moderne Technik, von STIHL bis Kärcher</li><li>Ein Team aus rund ${COMPANY.employees} Kolleginnen und Kollegen in Verkauf, Werkstatt und Service</li><li>Abwechslungsreiche Aufgaben, vom Kundengespräch bis zur Reparatur</li></ul>
</div>
<div class="card">
<h3>So bewerben Sie sich</h3>
<p>Melden Sie sich gern telefonisch unter <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a> oder per E-Mail an <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>. Ein paar Sätze zu Ihnen und Ihr Lebenslauf genügen für den Anfang.</p>
<div class="btns"><a class="btn" href="mailto:${COMPANY.email}?subject=${encodeURIComponent('Bewerbung')}">${icon('mail')}Bewerbung per E-Mail</a></div>
</div>
</div>
</section>`;
  return page(ctx, {
    path: '/karriere.html',
    nav: 'ueber-uns',
    title: 'Karriere und Stellenangebote in Ostrhauderfehn | Wilken Poelker',
    description: 'Jobs bei Wilken Poelker in Ostrhauderfehn: Verkäufer Motorgeräte, Motorgerätemechaniker und Zweiradmechaniker (m/w/d) im Familienbetrieb seit 1951.',
    ogImage: photo.large,
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── App ───────────────────────────────────────────────
function app(ctx) {
  const trail = [['Start', '/'], ['App', '/app.html']];
  const list = [
    ['Brauche ich für diese Website ein Konto?', 'Nein. Auf dieser Website gibt es keine Anmeldung. Ihr Kundenkonto mit Reparaturen, Terminen und Chat führen Sie ausschließlich in der App.'],
    ['Ich habe keine Bestätigungs-E-Mail erhalten.', 'Bitte prüfen Sie auch Ihren Spam-Ordner. Kommt keine E-Mail an, melden Sie sich bei uns, wir helfen Ihnen weiter.'],
    ['Meine Kundennummer wurde nicht erkannt.', 'Die automatische Zuordnung klappt nur, wenn Name und Anschrift mit unseren Kundendaten übereinstimmen. Andernfalls können Sie in der App eine Zuordnung beantragen. Wir prüfen das und schalten Sie frei.'],
    ['Ich bekomme keine Push-Benachrichtigungen.', 'Erlauben Sie Benachrichtigungen für die App in den Einstellungen Ihres Telefons. Auf manchen Geräten muss zusätzlich die Akku-Optimierung für die App deaktiviert werden.'],
    ['Passwort vergessen?', 'Tippen Sie auf dem Anmeldebildschirm der App auf „Passwort vergessen?“. Sie erhalten dann eine E-Mail zum Zurücksetzen.'],
    ['Wie lösche ich mein Konto?', `In der App unter „Einstellungen“ und „Meine Daten löschen“, oder Sie schreiben uns eine E-Mail an ${COMPANY.email}. Ihr Konto und Ihre Daten werden dann gelöscht.`],
  ];
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>Wilken Poelker in der Hosentasche</h1>
<p class="lead">Mit unserer kostenlosen App behalten Sie Ihre Reparaturen im Blick, fragen Termine an, stellen Service-Anfragen mit Foto und chatten direkt mit unserem Team.</p>
</div>
</section>
<section class="sec-tight"><div class="wrap">${C.appBand({ heading: 'Was die App für Sie erledigt' })}</div></section>
<section class="sec">
<div class="wrap">
<h2>In drei Schritten startklar</h2>
<ol class="steps" style="grid-template-columns:repeat(3,minmax(0,1fr))">
<li><h3>App installieren</h3><p>Kostenlos im App Store für iPhone und bei Google Play für Android.</p></li>
<li><h3>Registrieren</h3><p>Mit Name, Adresse und E-Mail-Adresse registrieren und die E-Mail bestätigen.</p></li>
<li><h3>Kundennummer verknüpfen</h3><p>Als Bestandskunde werden Sie meist automatisch erkannt, sonst fragen Sie die Zuordnung in der App an. Danach sehen Sie Ihre Reparaturen und können Termine anfragen.</p></li>
</ol>
<ul class="ticks" style="margin-top:28px"><li>Für unsere Kundinnen und Kunden kostenlos</li><li>Hell- und Dunkelmodus sowie anpassbare Schriftgröße</li><li>Auf Deutsch und Englisch</li><li>Ihre Daten können Sie in den Einstellungen jederzeit exportieren</li></ul>
</div>
</section>
<section class="sec band" id="support">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Hilfe und Support</h2><p>Wir helfen Ihnen gern weiter, bei Problemen mit der Anmeldung, der Kundennummer oder Benachrichtigungen: Telefon <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, E-Mail <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.</p></div></div>
${C.faqBlock(list)}
<p class="muted" style="margin-top:22px">Die Datenschutzhinweise zur App finden Sie in der App unter „Mehr“ und „Datenschutz“. Fragen zum Datenschutz beantwortet unser Datenschutzbeauftragter unter <a href="mailto:datenschutz@wilkenpoelker.de">datenschutz@wilkenpoelker.de</a>.</p>
</div>
</section>`;
  return page(ctx, {
    path: '/app.html',
    nav: 'app',
    title: 'Die Wilken-Poelker-App: Reparaturstatus, Termine, Chat',
    description: 'Die kostenlose Wilken-Poelker-App für iPhone und Android: Reparaturstatus mit Push-Nachricht, Termine anfragen, Service-Chat mit Foto und Neuigkeiten.',
    ogImage: '/assets/img/app/start-720.webp',
    smartBanner: true,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.faqPage(list), {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'Wilken Poelker',
      operatingSystem: 'iOS, Android',
      applicationCategory: 'BusinessApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      publisher: { '@id': seo.businessId(ctx) },
      downloadUrl: [COMPANY.appStore, COMPANY.playStore],
    }],
    body,
  });
}

// ── Kontakt ───────────────────────────────────────────
function contact(ctx) {
  const trail = [['Start', '/'], ['Kontakt', '/kontakt.html']];
  const faqList = faqs(C.hoursText(ctx));
  const body = `
<section class="phead">
<div class="wrap">
${C.crumbs(trail)}
<h1>Kontakt und Anfahrt</h1>
<p class="lead">Rufen Sie uns an, schreiben Sie uns oder kommen Sie vorbei. Ihre Nachricht landet direkt bei der zuständigen Abteilung.</p>
<div class="btns" style="margin-top:22px"><a class="btn" href="${COMPANY.phoneHref}">${icon('phone')}${COMPANY.phone}</a><a class="btn btn-quiet" href="mailto:${COMPANY.email}">${icon('mail')}${COMPANY.email}</a><a class="btn btn-quiet" href="${MAPS.route}" target="_blank" rel="noopener">${icon('route')}Route planen</a></div>
</div>
</section>
<section class="sec-tight" id="kontakt-formular">
<div class="wrap contact-grid">
<div class="prose-card">
<h2 style="font-size:1.6rem">Schreiben Sie uns</h2>
${C.inquiryForm({ prefix: 'ct', topics: true, submit: 'Nachricht senden' })}
</div>
<div class="visit-card">
<h3>Direkte Durchwahl</h3>
<p class="muted">Zentrale <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a>, Fax ${COMPANY.fax}</p>
${directNumbers(ctx)}
</div>
</div>
</section>
${C.visitSection(ctx, { heading: 'Öffnungszeiten und Anfahrt', text: 'Mitten im südlichen Ostfriesland, an der Langholter Straße in Ostrhauderfehn, gut erreichbar aus Rhauderfehn, Westoverledingen, Leer, Papenburg und dem Saterland.', id: 'anfahrt', band: true })}
<section class="sec">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Gut zu wissen</h2></div></div>
${C.faqBlock(faqList)}
</div>
</section>`;
  return page(ctx, {
    path: '/kontakt.html',
    nav: 'kontakt',
    title: 'Kontakt, Öffnungszeiten und Anfahrt | Wilken Poelker',
    description: `Wilken Poelker, ${COMPANY.street}, ${COMPANY.zip} ${COMPANY.city}. Telefon ${COMPANY.phone}. Öffnungszeiten, Anfahrt, direkte Durchwahlen und Kontaktformular.`,
    jsonLd: [seo.breadcrumbs(ctx, trail), seo.business(ctx), seo.faqPage(faqList)],
    body,
  });
}

module.exports = { bikes, leasing, service, about, career, app, contact };
