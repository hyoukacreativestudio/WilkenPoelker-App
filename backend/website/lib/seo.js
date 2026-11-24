// Structured data (schema.org JSON-LD) for search engines
const { COMPANY, MAPS } = require('./content');
const { L, mainName, deviceName } = require('./i18n');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const businessId = (ctx) => `${ctx.base}/#betrieb`;
const abs = (ctx, p) => (/^https?:/.test(p) ? p : `${ctx.base}${p}`);

function openingSpecs(schedule) {
  const specs = [];
  for (const d of schedule || []) {
    if (d.isClosed) continue;
    for (const p of d.periods || []) {
      const same = specs.find((s) => s.opens === p.open && s.closes === p.close);
      if (same) same.dayOfWeek.push(DAYS[d.dayOfWeek]);
      else specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [DAYS[d.dayOfWeek]], opens: p.open, closes: p.close });
    }
  }
  return specs;
}

function business(ctx) {
  const season = ctx.hours.currentSeason && ctx.hours[ctx.hours.currentSeason] ? ctx.hours.currentSeason : (ctx.hours.standard ? 'standard' : 'winter');
  const special = [];
  for (const c of ctx.closedDays) {
    if (c.isClosed || !(c.specialHours || []).length) {
      special.push({ '@type': 'OpeningHoursSpecification', validFrom: c.date, validThrough: c.date, opens: '00:00', closes: '00:00' });
    } else {
      for (const p of c.specialHours) special.push({ '@type': 'OpeningHoursSpecification', validFrom: c.date, validThrough: c.date, opens: p.open, closes: p.close });
    }
  }
  return {
    '@context': 'https://schema.org',
    '@type': ['GardenStore', 'BikeStore'],
    '@id': businessId(ctx),
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    description: L('Familienbetrieb seit 1951 in Ostrhauderfehn: E-Bikes und Fahrräder, Motor- und Gartengeräte, Reinigungstechnik als autorisierter Kärcher-Händler, eigene Werkstätten, Ersatzteillager und 2.500\u00a0m² Teststrecke.',
      'Family business in Ostrhauderfehn since 1951: e-bikes and bicycles, power and garden tools, cleaning equipment as an authorised Kärcher dealer, our own workshops, a spare parts stock and a 2,500\u00a0m² test track.'),
    url: `${ctx.base}/`,
    logo: `${ctx.base}/assets/img/logo.png`,
    image: ctx.businessImages.map((p) => abs(ctx, p)),
    telephone: COMPANY.phoneLd,
    faxNumber: COMPANY.faxLd,
    email: COMPANY.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.street,
      postalCode: COMPANY.zip,
      addressLocality: COMPANY.city,
      addressRegion: COMPANY.region,
      addressCountry: COMPANY.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: COMPANY.geo.lat, longitude: COMPANY.geo.lng },
    areaServed: COMPANY.area.map((name) => ({ '@type': 'City', name })),
    hasMap: MAPS.open,
    foundingDate: String(COMPANY.founded),
    founder: { '@type': 'Person', name: COMPANY.founder },
    numberOfEmployees: { '@type': 'QuantitativeValue', value: COMPANY.employees },
    openingHoursSpecification: openingSpecs(ctx.hours[season]),
    specialOpeningHoursSpecification: special.length ? special : undefined,
    currenciesAccepted: 'EUR',
    sameAs: [COMPANY.facebook, COMPANY.instagram],
  };
}

function website(ctx) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${ctx.base}/#website`,
    url: `${ctx.base}/`,
    name: 'Wilken Poelker',
    alternateName: ['Wilken Poelker GmbH & Co. KG', 'Wilken Poelker Ostrhauderfehn'],
    inLanguage: ['de-DE', 'en-GB'],
    publisher: { '@id': businessId(ctx) },
  };
}

function breadcrumbs(ctx, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(ctx, path) })),
  };
}

function faqPage(list) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

// Not a shop: available products can be bought in the store only.
function product(ctx, p, images, description) {
  const url = `${ctx.base}/produkte/p/${p.slug}.html`;
  const offer = (v) => ({
    '@type': 'Offer',
    sku: v.artNr,
    price: Number(v.price).toFixed(2),
    priceCurrency: 'EUR',
    availability: v.available ? 'https://schema.org/InStoreOnly' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    url,
    seller: { '@id': businessId(ctx) },
    availableAtOrFrom: { '@id': businessId(ctx) },
  });
  const priced = (p.variants || []).filter((v) => v.price != null);
  let offers;
  if (priced.length === 1) offers = offer(priced[0]);
  else if (priced.length > 1) {
    const prices = priced.map((v) => Number(v.price));
    offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: priced.length,
      availability: priced.some((v) => v.available) ? 'https://schema.org/InStoreOnly' : 'https://schema.org/OutOfStock',
      offers: priced.map(offer),
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#produkt`,
    name: p.title,
    url,
    image: images.length ? images.map((im) => abs(ctx, im.big)) : undefined,
    description,
    sku: p.variants?.[0]?.artNr,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    model: p.model || undefined,
    category: [p.main && mainName(p.main), p.device && deviceName(p.device)].filter(Boolean).join(' > '),
    offers,
  };
}

function itemList(ctx, name, products) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 60).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ctx.base}/produkte/p/${p.slug}.html`, name: p.title })),
  };
}

module.exports = { business, website, breadcrumbs, faqPage, product, itemList, businessId };
