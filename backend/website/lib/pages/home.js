const { esc, dateDe } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY, txt } = require('../content');
const { L, isEn, positionName } = require('../i18n');
const seo = require('../seo');

// Workshop and service people with a real photo (mosaic of the "Werkstatt" tile)
const WORKSHOP_DEPS = ['Service / Reparatur', 'Werkstatt Zweirad', 'Werkstatt Motorgeraete', 'Kaercher', 'Maehroboter'];

// A feed post of the app as website text: no emoji (the website has none), the
// first short line becomes the heading, line breaks stay
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;
function newsText(content, max = 300) {
  const lines = String(content || '').replace(EMOJI, '').split(/\r?\n/).map((l) => l.replace(/[ \t]+/g, ' ').trim());
  while (lines.length && !lines[0]) lines.shift();
  let title = '';
  if (lines.length > 1 && lines[0].length <= 70 && lines.slice(1).some(Boolean)) title = lines.shift().replace(/[:\s]+$/, '');
  let body = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length > max) {
    const cut = body.slice(0, max - 1);
    body = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[,;:.\s-]+$/, '')} …`;
  }
  return { title, body };
}

async function teamFaces(ctx, deps) {
  const out = [];
  for (const dep of ctx.team) {
    if (deps && !deps.includes(dep.key)) continue;
    for (const m of dep.members) {
      const p = await ctx.images.portrait(m);
      if (p) out.push({ name: m.name, position: positionName(m.position), ...p });
    }
  }
  return out;
}

async function home(ctx) {
  const { SERVICES, faqs } = txt();
  const ph = async (n) => ctx.images.photo(n);
  const [hero, bikes, motor, clean, store, track] = await Promise.all(['outdoor5', 'bikes-area2', 'laden14', 'kaercher1', 'laden8', 'outdoor4'].map(ph));
  const workshopFaces = (await teamFaces(ctx, WORKSHOP_DEPS)).slice(0, 12);
  const allFaces = await teamFaces(ctx);
  const md = (ctx.team.find((d) => d.key === 'Geschaeftsfuehrung') || { members: [] }).members[0];
  const mdPhoto = md ? await ctx.images.portrait(md) : null;
  const teamSize = ctx.team.reduce((n, d) => n + d.members.length, 0);

  const cat = (name) => ctx.categories.find((c) => c.name === name);
  const motorUrl = (cat('Rasen & Wiese') || cat('Sägen & Holz') || { url: '/produkte/' }).url;
  const cleanUrl = (cat('Reinigen') || { url: '/produkte/' }).url;

  const offers = ctx.products.filter((p) => p.isOffer && p.available)
    .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0) || a.title.localeCompare(b.title, 'de'))
    .slice(0, 12);

  const brandCounts = new Map();
  for (const p of ctx.products) if (p.brand) brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
  const brands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  // The posts of the app are written in German: only on the German page
  const news = [];
  for (const n of isEn() ? [] : ctx.news.slice(0, 3)) {
    const src = n.thumbnailUrl || (n.type === 'image' || /\.(jpe?g|png|webp)$/i.test(n.mediaUrl || '') ? n.mediaUrl : null);
    news.push({ ...n, ...newsText(n.content), product: /\/uploads\/shop\//.test(src || ''), img: src ? await ctx.images.news(src) : null });
  }

  const faqList = faqs(C.hoursText(ctx));
  const areaSizes = '(max-width: 560px) 34vw, (max-width: 1000px) 50vw, 25vw';

  const body = `
<section class="hero">
<div class="wrap">
<div class="hero-top">
<h1>${L('<span class="l1">Qualität aus Familienhand. Seit 1951.</span><span class="l2">E-Bikes, Motor- und Gartengeräte, Reinigungstechnik und eigene Werkstätten in Ostrhauderfehn.</span>',
    '<span class="l1">Quality from a family business. Since 1951.</span><span class="l2">E-bikes, power and garden tools, cleaning equipment and our own workshops in Ostrhauderfehn, Germany.</span>')}</h1>
<div class="hero-side">
<p class="lead">${L(`Einer der großen Fachhändler im Norden, geführt in dritter Generation: ehrliche Beratung, vier eigene Werkstätten und ein großes Ersatzteillager, auf ${COMPANY.salesArea} Ausstellung mit ${COMPANY.testTrack} Teststrecke.`,
    `One of the large specialist dealers in northern Germany, run by the third generation: honest advice, four workshops of our own and a large spare parts stock, with a ${COMPANY.salesArea} showroom and a ${COMPANY.testTrack} test track.`)}</p>
<div class="btns"><a class="btn" href="/produkte/">${icon('grid')}${L('Produkte ansehen', 'View products')}</a><a class="btn btn-quiet" href="#besuch">${icon('clock')}${L('Öffnungszeiten und Anfahrt', 'Opening hours and directions')}</a></div>
</div>
</div>
<div class="pano">
<figure class="pano-photo">${C.photoImg(hero, { alt: L('Unser Geschäft an der Langholter Straße mit der Teststrecke davor', 'Our shop on Langholter Straße with the test track in front'), sizes: '(max-width: 1280px) 100vw, 1240px', eager: true })}<figcaption>${L(`Unser Haus an der Langholter Straße, davor die ${COMPANY.testTrack} große Teststrecke`, `Our shop on Langholter Straße, with the ${COMPANY.testTrack} test track in front`)}</figcaption></figure>
${C.shopSign(ctx)}
</div>
<ul class="hero-proof">
<li>${icon('heart')}${L('Familienbetrieb seit 1951', 'Family business since 1951')}</li>
<li>${icon('award')}${L('QMF-zertifizierter Fachbetrieb', 'QMF-certified specialist')}</li>
<li>${icon('shield')}${L('Autorisierter Kärcher-Händler', 'Authorised Kärcher dealer')}</li>
<li>${icon('wrench')}${L('Vier eigene Werkstätten', 'Four workshops of our own')}</li>
</ul>
</div>
</section>

<section class="sec" id="bereiche">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Vier Bereiche unter einem Dach', 'Four departments under one roof')}</h2><p>${L('Von der Beratung über die Auswahl bis zum Service nach dem Kauf: Qualität von namhaften Herstellern und die passende Betreuung dazu.', 'From advice and choice to service after the purchase: quality from well-known manufacturers and the care that goes with it.')}</p></div></div>
<div class="areas">
<a class="area" href="/fahrraeder.html"><div class="area-ph">${C.photoImg(bikes, { alt: L('Fahrradausstellung mit E-Bikes und Kinderrädern', 'Bicycle showroom with e-bikes and children’s bikes'), sizes: areaSizes })}</div><div class="area-tx"><h3>${L('E-Bikes und Fahrräder', 'E-bikes and bicycles')}</h3><p>${L('Vom Kinderrad bis zum E-Bike: in Ruhe vergleichen und auf der Teststrecke Probe fahren. Dienstrad-Leasing über fünf Partner.', 'From children’s bikes to e-bikes: compare at your leisure and take a test ride on the test track. Bike leasing through five partners.')}</p><span class="go">${L('Zu den Fahrrädern', 'Bicycles')}${icon('arrow-right')}</span></div></a>
<a class="area" href="${motorUrl}"><div class="area-ph">${C.photoImg(motor, { alt: L('Ausstellung mit Motor- und Gartengeräten', 'Showroom with power and garden tools'), sizes: areaSizes })}</div><div class="area-tx"><h3>${L('Motor- und Gartengeräte', 'Power and garden tools')}</h3><p>${L('Rasenmäher, Mähroboter, Motorsägen und Heckenscheren, vom QMF-zertifizierten Fachbetrieb.', 'Lawn mowers, robotic mowers, chainsaws and hedge trimmers, from a QMF-certified specialist.')}</p><span class="go">${L('Zu den Geräten', 'Power tools')}${icon('arrow-right')}</span></div></a>
<a class="area" href="${cleanUrl}"><div class="area-ph">${C.photoImg(clean, { alt: L('Kärcher-Ausstellung mit Reinigungsmaschinen', 'Kärcher showroom with cleaning machines'), sizes: areaSizes })}</div><div class="area-tx"><h3>${L('Reinigungstechnik', 'Cleaning equipment')}</h3><p>${L('Autorisierter Kärcher-Händler mit eigener Kärcher-Werkstatt und Monteur im Außendienst.', 'Authorised Kärcher dealer with our own Kärcher workshop and a field service technician.')}</p><span class="go">${L('Zur Reinigungstechnik', 'Cleaning equipment')}${icon('arrow-right')}</span></div></a>
<a class="area" href="/service.html"><div class="area-ph area-faces" aria-hidden="true">${workshopFaces.map((f) => `<img src="${f.small}" alt="" width="128" height="128" loading="lazy">`).join('')}</div><div class="area-tx"><h3>${L('Werkstatt und Service', 'Workshop and service')}</h3><p>${L('Vier Werkstätten unter einem Dach, mit Hol- und Bringdienst und großem Ersatzteillager.', 'Four workshops under one roof, with a pick-up and delivery service and a large spare parts stock.')}</p><span class="go">${L('Zum Service', 'Service')}${icon('arrow-right')}</span></div></a>
</div>
</div>
</section>
${offers.length ? `
<section class="sec band" id="angebote">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Aktuelle Angebote', 'Current offers')}</h2><p>${L('Geräte, die bei uns im Laden stehen und deren Preis unter der unverbindlichen Preisempfehlung (UVP) des Herstellers liegt. Preise direkt aus unserer Warenwirtschaft, solange der Vorrat reicht.', 'Equipment in our shop priced below the manufacturer’s recommended retail price (RRP). Prices straight from our merchandise management system, while stocks last.')}</p></div><a class="link-more" href="/angebote.html">${L('Alle Angebote', 'All offers')}${icon('arrow-right')}</a></div>
<div class="rail">${offers.map((p) => C.productCard(p, ctx.productImages.get(p.slug)?.[0])).join('')}</div>
</div>
</section>` : ''}

<section class="sec" id="familienbetrieb">
<div class="wrap">
<div class="story">
<div class="story-text">
<h2>${L('Ein Familienbetrieb, seit drei Generationen', 'A family business for three generations')}</h2>
${L(`<p class="lead">Was 1951 mit einer kleinen Werkstatt von Wilken Poelker begann, ist heute ein Fachhandel mit rund ${COMPANY.employees} Mitarbeiterinnen und Mitarbeitern, geführt in dritter Generation.</p>
<p>Geblieben ist, was von Anfang an zählte: mit Rat und Tat für unsere Kundinnen und Kunden da zu sein. Deshalb setzen wir auf Qualität statt auf schnelle Ware. Wir wählen Hersteller, deren Ersatzteile es auch Jahre nach dem Kauf noch gibt, damit sich eine Reparatur lohnt und Ihr Gerät Sie lange begleitet.</p>
<p>Zu jedem Verkauf gehört bei uns ein starkes Werkstatt-Team, von der Inspektion über die Reparatur bis zur Versorgung mit Ersatzteilen. Und wer bei uns anruft, erreicht direkt unser Team vor Ort.</p>`,
    `<p class="lead">What Wilken Poelker started in 1951 with a small workshop is today a specialist dealer with around ${COMPANY.employees} employees, run by the third generation.</p>
<p>What mattered from the start still matters: being there for our customers with advice and help. That is why we choose quality over quick sales. We pick manufacturers whose spare parts are still available years after the purchase, so that a repair is worthwhile and your equipment serves you for a long time.</p>
<p>Every sale comes with a strong workshop team, from inspections and repairs to spare parts. And when you call us, you speak directly to our team in the shop.</p>`)}
<div class="sign-off"><img src="/assets/img/unterschrift.png" alt="${L('Ihr Team von Wilken Poelker', 'Your Wilken Poelker team')}" width="400" height="60" loading="lazy"></div>
</div>
<div class="story-side">
<div class="story-photo">${C.photoImg(store, { alt: L('Rasenmäher-Ausstellung in unserem Geschäft', 'Lawn mower display in our shop'), sizes: '(max-width: 900px) 100vw, 45vw' })}${mdPhoto ? `<span class="md"><img src="${mdPhoto.src}" alt="${esc(md.name)}, ${esc(positionName(md.position))}" width="360" height="360" loading="lazy"></span>` : ''}</div>
<dl class="facts">
<div><dt>${L('Gegründet', 'Founded')}</dt><dd>${L('1951 von Wilken Poelker', 'in 1951 by Wilken Poelker')}</dd></div>
<div><dt>${L('Geführt', 'Run')}</dt><dd>${L('in dritter Generation, bis heute in Familienhand', 'by the third generation, still family-owned')}</dd></div>
<div><dt>Team</dt><dd>${L(`rund ${COMPANY.employees} Menschen in Verkauf, Werkstatt und Service`, `around ${COMPANY.employees} people in sales, workshop and service`)}</dd></div>
<div><dt>${L('Ausstellung', 'Showroom')}</dt><dd>${L(`${COMPANY.salesArea}, dazu ${COMPANY.testTrack} Teststrecke im Freien`, `${COMPANY.salesArea}, plus a ${COMPANY.testTrack} outdoor test track`)}</dd></div>
<div><dt>${L('Werkstätten', 'Workshops')}</dt><dd>${L('Zweirad, Motorgeräte, Kärcher und Mähroboter', 'Bicycles, power tools, Kärcher and robotic mowers')}</dd></div>
</dl>
</div>
</div>
${allFaces.length ? `<div class="faces-wrap">
<div class="faces-text"><h3>${L(`Rund ${COMPANY.employees} Menschen, ein Ziel: zufriedene Kundinnen und Kunden`, `Around ${COMPANY.employees} people, one goal: happy customers`)}</h3><p>${L('Für jedes Anliegen gibt es bei uns den richtigen Ansprechpartner, vom Verkauf über die Werkstatt bis zum Ersatzteilservice.', 'Whatever you need, we have the right person for it, from sales and the workshop to the spare parts service.')}</p><a class="link-more" href="/ueber-uns.html#team">${teamSize > allFaces.length ? L(`Alle ${teamSize} kennenlernen`, `Meet all ${teamSize}`) : L('Unser Team kennenlernen', 'Meet our team')}${icon('arrow-right')}</a></div>
<ul class="faces" data-reveal>${allFaces.slice(0, 24).map((f, i) => `<li style="--i:${i}"><img src="${f.small}" alt="${esc(f.name)}" title="${esc(f.name)}, ${esc(f.position)}" width="128" height="128" loading="lazy"></li>`).join('')}</ul>
</div>` : ''}
</div>
</section>

<section class="sec band" id="leistungen">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Service, der nach dem Kauf weitergeht', 'Service that continues after the purchase')}</h2><p>${L('Ein Gerät ist nur so gut wie die Betreuung dahinter. Deshalb gehört bei uns der Service dazu, vom ersten Gespräch bis zur zehnten Inspektion.', 'Equipment is only as good as the care behind it. That is why service is part of the deal with us, from the first conversation to the tenth inspection.')}</p></div><a class="link-more" href="/service.html">${L('Werkstatt und Service', 'Workshop and service')}${icon('arrow-right')}</a></div>
<ul class="svc">${SERVICES.map(([ic, t, d]) => `<li><span class="ico">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ul>
</div>
</section>

${C.reviewsSection()}

<section class="sec sec-flush" id="app">
<div class="wrap">
${C.appBand()}
</div>
</section>

<section class="sec" id="qualitaet">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Geprüfte Qualität und Marken, die halten', 'Certified quality and brands that last')}</h2><p>${L('Wir setzen bewusst auf renommierte Hersteller, deren Ersatzteile auch Jahre nach dem Kauf noch verfügbar sind. Das schützt Ihre Investition.', 'We deliberately choose renowned manufacturers whose spare parts are still available years after the purchase. That protects your investment.')}</p></div></div>
<div class="certs">
<div class="cert"><span class="logo"><img src="/assets/img/qmf.webp" alt="${L('QMF – Qualität mit Fachbetrieb', 'QMF – Qualität mit Fachbetrieb (quality from a specialist)')}" width="260" height="137" loading="lazy"></span><h3>${L('QMF-zertifizierter Fachbetrieb', 'QMF-certified specialist')}</h3><p>${L('„Qualität mit Fachbetrieb“ für Rasenmäher, Rasentraktoren, Motorsensen, Motorsägen und Kehrmaschinen. Zertifizierte Betriebe erfüllen strenge Kriterien und werden regelmäßig überprüft.', '“Qualität mit Fachbetrieb” (quality from a specialist) for lawn mowers, lawn tractors, brushcutters, chainsaws and sweepers. Certified businesses meet strict criteria and are checked regularly.')}</p></div>
<div class="cert"><span class="logo"><img src="/assets/img/kaercher-haendler.png" alt="Kärcher" width="480" height="119" loading="lazy"></span><h3>${L('Autorisierter Kärcher-Händler', 'Authorised Kärcher dealer')}</h3><p>${L('Die gesamte Kärcher-Palette, vom Hochdruckreiniger bis zur Scheuersaugmaschine, mit eigener Kärcher-Werkstatt und Monteur im Außendienst.', 'The entire Kärcher range, from pressure washers to scrubber dryers, with our own Kärcher workshop and a field service technician.')}</p></div>
<div class="cert"><span class="logo"><span class="fair">FairCommerce</span></span><h3>${L('Mitglied bei FairCommerce', 'Member of FairCommerce')}</h3><p>${L('Seit Februar 2022 sind wir Mitglied der Initiative FairCommerce des Händlerbundes, für faires und transparentes Handeln.', 'Since February 2022 we have been a member of the FairCommerce initiative of the Händlerbund, for fair and transparent trading.')}</p></div>
</div>
<div class="brands-head"><h3>${L('Unsere Marken', 'Our brands')}</h3><a class="link-more" href="/marken/">${L('Alle Marken', 'All brands')}${icon('arrow-right')}</a></div>
<div class="brandwall">${brands.map(([b, n]) => `<a href="/marken/${ctx.brandSlug(b)}.html">${esc(b)} <small>${n}</small></a>`).join('')}</div>
</div>
</section>
${news.length ? `
<section class="sec band" id="neuigkeiten">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Neuigkeiten aus dem Laden</h2><p>Aktionen und Neuheiten, so wie in unserer App.</p></div><a class="link-more" href="/app.html">Mehr in der App${icon('arrow-right')}</a></div>
<div class="news">${news.map((n) => `<article class="${n.img ? (n.product ? 'is-product' : 'is-photo') : 'is-note'}">${n.img ? `<div class="ph"><img src="${n.img.src}" alt="" width="${n.img.width}" height="${n.img.height}" loading="lazy"></div>` : ''}<div class="tx"><time datetime="${esc(n.createdAt)}">${esc(dateDe(n.createdAt))}</time>${n.title ? `<h3>${esc(n.title)}</h3>` : ''}<p>${esc(n.body)}</p></div></article>`).join('')}</div>
</div>
</section>` : ''}

${C.visitSection(ctx, { band: !news.length })}

<section class="sec" id="fragen">
<div class="wrap faq-wrap">
<div class="sec-head"><div class="head-text"><h2>${L('Gut zu wissen', 'Good to know')}</h2><p>${L('Antworten auf die Fragen, die uns am häufigsten gestellt werden. Ihre Frage ist nicht dabei? <a href="/kontakt.html">Schreiben Sie uns</a>.', 'Answers to the questions we are asked most often. Your question is not here? <a href="/kontakt.html">Write to us</a>.')}</p></div></div>
${C.faqBlock(faqList)}
</div>
</section>`;

  return page(ctx, {
    path: '/',
    nav: 'home',
    title: L('Wilken Poelker Ostrhauderfehn: E-Bikes, Motorgeräte, Kärcher', 'Wilken Poelker Ostrhauderfehn: e-bikes, power tools, Kärcher'),
    description: L('Familienbetrieb seit 1951 in Ostrhauderfehn: E-Bikes, Motor- und Gartengeräte, Kärcher-Reinigungstechnik, eigene Werkstätten und 2.500 m² Teststrecke.', 'Family business in Ostrhauderfehn, Germany, since 1951: e-bikes, power and garden tools, Kärcher cleaning equipment, our own workshops and a 2,500 m² test track.'),
    ogImage: track ? track.large : undefined,
    smartBanner: true,
    jsonLd: [seo.business(ctx), seo.website(ctx), seo.faqPage(faqList)],
    body,
  });
}

module.exports = { home, teamFaces };
