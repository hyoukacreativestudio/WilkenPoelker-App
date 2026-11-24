const { esc, dateDe } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY, SERVICES, faqs } = require('../content');
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
      const p = await ctx.images.portrait(m.image);
      if (p) out.push({ name: m.name, position: m.position, ...p });
    }
  }
  return out;
}

async function home(ctx) {
  const ph = async (n) => ctx.images.photo(n);
  const [hero, bikes, motor, clean, store, track] = await Promise.all(['outdoor5', 'bikes-area2', 'laden14', 'kaercher1', 'laden8', 'outdoor4'].map(ph));
  const workshopFaces = (await teamFaces(ctx, WORKSHOP_DEPS)).slice(0, 12);
  const allFaces = await teamFaces(ctx);
  const md = (ctx.team.find((d) => d.key === 'Geschaeftsfuehrung') || { members: [] }).members[0];
  const mdPhoto = md ? await ctx.images.portrait(md.image) : null;
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

  const news = [];
  for (const n of ctx.news.slice(0, 3)) {
    const src = n.thumbnailUrl || (n.type === 'image' || /\.(jpe?g|png|webp)$/i.test(n.mediaUrl || '') ? n.mediaUrl : null);
    news.push({ ...n, ...newsText(n.content), product: /\/uploads\/shop\//.test(src || ''), img: src ? await ctx.images.news(src) : null });
  }

  const faqList = faqs(C.hoursText(ctx));

  const body = `
<section class="hero">
<div class="wrap">
<div class="hero-top">
<h1><span class="l1">Qualität aus Familienhand. Seit 1951.</span><span class="l2">E-Bikes, Motor- und Gartengeräte, Reinigungstechnik und eigene Werkstätten in Ostrhauderfehn.</span></h1>
<div class="hero-side">
<p class="lead">Einer der großen Fachhändler im Norden, geführt in dritter Generation: ehrliche Beratung, vier eigene Werkstätten und ein großes Ersatzteillager, auf ${COMPANY.salesArea} Ausstellung mit ${COMPANY.testTrack} Teststrecke.</p>
<div class="btns"><a class="btn" href="/produkte/">${icon('grid')}Produkte ansehen</a><a class="btn btn-quiet" href="#besuch">${icon('clock')}Öffnungszeiten und Anfahrt</a></div>
</div>
</div>
<div class="pano">
<figure class="pano-photo">${C.photoImg(hero, { alt: 'Unser Geschäft an der Langholter Straße mit der Teststrecke davor', sizes: '(max-width: 1280px) 100vw, 1240px', eager: true })}<figcaption>Unser Haus an der Langholter Straße, davor die ${COMPANY.testTrack} große Teststrecke</figcaption></figure>
${C.shopSign(ctx)}
</div>
<ul class="hero-proof">
<li>${icon('heart')}Familienbetrieb seit 1951</li>
<li>${icon('award')}QMF-zertifizierter Fachbetrieb</li>
<li>${icon('shield')}Autorisierter Kärcher-Händler</li>
<li>${icon('wrench')}Vier eigene Werkstätten</li>
</ul>
</div>
</section>

<section class="sec" id="bereiche">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Vier Bereiche unter einem Dach</h2><p>Von der Beratung über die Auswahl bis zum Service nach dem Kauf: Qualität von namhaften Herstellern und die passende Betreuung dazu.</p></div></div>
<div class="areas">
<a class="area" href="/fahrraeder.html"><div class="area-ph">${C.photoImg(bikes, { alt: 'Fahrradausstellung mit E-Bikes und Kinderrädern', sizes: '(max-width: 560px) 34vw, (max-width: 1000px) 50vw, 25vw' })}</div><div class="area-tx"><h3>E-Bikes und Fahrräder</h3><p>Vom Kinderrad bis zum E-Bike: in Ruhe vergleichen und auf der Teststrecke Probe fahren. Dienstrad-Leasing über fünf Partner.</p><span class="go">Zu den Fahrrädern${icon('arrow-right')}</span></div></a>
<a class="area" href="${motorUrl}"><div class="area-ph">${C.photoImg(motor, { alt: 'Ausstellung mit Motor- und Gartengeräten', sizes: '(max-width: 560px) 34vw, (max-width: 1000px) 50vw, 25vw' })}</div><div class="area-tx"><h3>Motor- und Gartengeräte</h3><p>Rasenmäher, Mähroboter, Motorsägen und Heckenscheren, vom QMF-zertifizierten Fachbetrieb.</p><span class="go">Zu den Geräten${icon('arrow-right')}</span></div></a>
<a class="area" href="${cleanUrl}"><div class="area-ph">${C.photoImg(clean, { alt: 'Kärcher-Ausstellung mit Reinigungsmaschinen', sizes: '(max-width: 560px) 34vw, (max-width: 1000px) 50vw, 25vw' })}</div><div class="area-tx"><h3>Reinigungstechnik</h3><p>Autorisierter Kärcher-Händler mit eigener Kärcher-Werkstatt und Monteur im Außendienst.</p><span class="go">Zur Reinigungstechnik${icon('arrow-right')}</span></div></a>
<a class="area" href="/service.html"><div class="area-ph area-faces" aria-hidden="true">${workshopFaces.map((f) => `<img src="${f.small}" alt="" width="128" height="128" loading="lazy">`).join('')}</div><div class="area-tx"><h3>Werkstatt und Service</h3><p>Vier Werkstätten unter einem Dach, mit Hol- und Bringdienst und großem Ersatzteillager.</p><span class="go">Zum Service${icon('arrow-right')}</span></div></a>
</div>
</div>
</section>
${offers.length ? `
<section class="sec band" id="angebote">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Aktuelle Angebote</h2><p>Reduzierte Geräte, die bei uns im Laden stehen. Preise direkt aus unserer Warenwirtschaft, solange der Vorrat reicht.</p></div><a class="link-more" href="/angebote.html">Alle Angebote${icon('arrow-right')}</a></div>
<div class="rail">${offers.map((p) => C.productCard(p, ctx.productImages.get(p.slug)?.[0])).join('')}</div>
</div>
</section>` : ''}

<section class="sec" id="familienbetrieb">
<div class="wrap">
<div class="story">
<div class="story-text">
<h2>Ein Familienbetrieb, seit drei Generationen</h2>
<p class="lead">Was 1951 mit einer kleinen Werkstatt von Wilken Poelker begann, ist heute ein Fachhandel mit rund ${COMPANY.employees} Mitarbeiterinnen und Mitarbeitern, geführt in dritter Generation.</p>
<p>Geblieben ist, was von Anfang an zählte: mit Rat und Tat für unsere Kundinnen und Kunden da zu sein. Deshalb setzen wir auf Qualität statt auf schnelle Ware. Wir wählen Hersteller, deren Ersatzteile es auch Jahre nach dem Kauf noch gibt, damit sich eine Reparatur lohnt und Ihr Gerät Sie lange begleitet.</p>
<p>Zu jedem Verkauf gehört bei uns ein starkes Werkstatt-Team, von der Inspektion über die Reparatur bis zur Versorgung mit Ersatzteilen. Und wer bei uns anruft, erreicht direkt unser Team vor Ort.</p>
<div class="sign-off"><img src="/assets/img/unterschrift.png" alt="Ihr Team von Wilken Poelker" width="400" height="60" loading="lazy"></div>
</div>
<div class="story-side">
<div class="story-photo">${C.photoImg(store, { alt: 'Rasenmäher-Ausstellung in unserem Geschäft', sizes: '(max-width: 900px) 100vw, 45vw' })}${mdPhoto ? `<span class="md"><img src="${mdPhoto.src}" alt="${esc(md.name)}, ${esc(md.position)}" width="360" height="360" loading="lazy"></span>` : ''}</div>
<dl class="facts">
<div><dt>Gegründet</dt><dd>1951 von Wilken Poelker</dd></div>
<div><dt>Geführt</dt><dd>in dritter Generation, bis heute in Familienhand</dd></div>
<div><dt>Team</dt><dd>rund ${COMPANY.employees} Menschen in Verkauf, Werkstatt und Service</dd></div>
<div><dt>Ausstellung</dt><dd>${COMPANY.salesArea}, dazu ${COMPANY.testTrack} Teststrecke im Freien</dd></div>
<div><dt>Werkstätten</dt><dd>Zweirad, Motorgeräte, Kärcher und Mähroboter</dd></div>
</dl>
</div>
</div>
${allFaces.length ? `<div class="faces-wrap">
<div class="faces-text"><h3>Rund ${COMPANY.employees} Menschen, ein Ziel: zufriedene Kundinnen und Kunden</h3><p>Für jedes Anliegen gibt es bei uns den richtigen Ansprechpartner, vom Verkauf über die Werkstatt bis zum Ersatzteilservice.</p><a class="link-more" href="/ueber-uns.html#team">${teamSize > allFaces.length ? `Alle ${teamSize} kennenlernen` : 'Unser Team kennenlernen'}${icon('arrow-right')}</a></div>
<ul class="faces" data-reveal>${allFaces.slice(0, 24).map((f, i) => `<li style="--i:${i}"><img src="${f.small}" alt="${esc(f.name)}" title="${esc(f.name)}, ${esc(f.position)}" width="128" height="128" loading="lazy"></li>`).join('')}</ul>
</div>` : ''}
</div>
</section>

<section class="sec band" id="leistungen">
<div class="wrap">
<div class="sec-head"><div class="head-text"><h2>Service, der nach dem Kauf weitergeht</h2><p>Ein Gerät ist nur so gut wie die Betreuung dahinter. Deshalb gehört bei uns der Service dazu, vom ersten Gespräch bis zur zehnten Inspektion.</p></div><a class="link-more" href="/service.html">Werkstatt und Service${icon('arrow-right')}</a></div>
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
<div class="sec-head"><div class="head-text"><h2>Geprüfte Qualität und Marken, die halten</h2><p>Wir setzen bewusst auf renommierte Hersteller, deren Ersatzteile auch Jahre nach dem Kauf noch verfügbar sind. Das schützt Ihre Investition.</p></div></div>
<div class="certs">
<div class="cert"><span class="logo"><img src="/assets/img/qmf.jpg" alt="QMF – Qualität mit Fachbetrieb" width="380" height="200" loading="lazy"></span><h3>QMF-zertifizierter Fachbetrieb</h3><p>„Qualität mit Fachbetrieb“ für Rasenmäher, Rasentraktoren, Motorsensen, Motorsägen und Kehrmaschinen. Zertifizierte Betriebe erfüllen strenge Kriterien und werden regelmäßig überprüft.</p></div>
<div class="cert"><span class="logo"><img src="/assets/img/kaercher-haendler.png" alt="Kärcher" width="600" height="149" loading="lazy"></span><h3>Autorisierter Kärcher-Händler</h3><p>Die gesamte Kärcher-Palette, vom Hochdruckreiniger bis zur Scheuersaugmaschine, mit eigener Kärcher-Werkstatt und Monteur im Außendienst.</p></div>
<div class="cert"><span class="logo"><span class="fair">FairCommerce</span></span><h3>Mitglied bei FairCommerce</h3><p>Seit Februar 2022 sind wir Mitglied der Initiative FairCommerce des Händlerbundes, für faires und transparentes Handeln.</p></div>
</div>
<div class="brands-head"><h3>Unsere Marken</h3><a class="link-more" href="/marken/">Alle Marken${icon('arrow-right')}</a></div>
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
<div class="sec-head"><div class="head-text"><h2>Gut zu wissen</h2><p>Antworten auf die Fragen, die uns am häufigsten gestellt werden. Ihre Frage ist nicht dabei? <a href="/kontakt.html">Schreiben Sie uns</a>.</p></div></div>
${C.faqBlock(faqList)}
</div>
</section>`;

  return page(ctx, {
    path: '/',
    nav: 'home',
    title: 'Wilken Poelker Ostrhauderfehn: E-Bikes, Motorgeräte, Kärcher',
    description: 'Familienbetrieb seit 1951 in Ostrhauderfehn: E-Bikes, Motor- und Gartengeräte, Kärcher-Reinigungstechnik, eigene Werkstätten und 2.500 m² Teststrecke.',
    ogImage: track ? track.large : undefined,
    smartBanner: true,
    jsonLd: [seo.business(ctx), seo.website(ctx), seo.faqPage(faqList)],
    body,
  });
}

module.exports = { home, teamFaces };
