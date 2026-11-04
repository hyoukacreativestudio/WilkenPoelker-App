const { ShopBrand, ShopGroup } = require('../../models');
const { KAERCHER_WHG_OFFSET: K } = require('./taifunArticleParser');

// Warengruppen as listed by the shop (Taifun WHG numbers).
const GROUPS = [
  [100, 'Motorgeräte Benzin', 'motor', 'benzin'],
  [101, 'Akku-Geräte AI + AS', 'motor', 'akku'],
  [102, 'Akku-Geräte AK + AP', 'motor', 'akku'],
  [103, 'Freischneider Benzin', 'motor', 'benzin'],
  [104, 'Motorgeräte Elektro', 'motor', 'elektro'],
  [105, 'Motorsägen Benzin', 'motor', 'benzin'],
  [106, 'Akku-Geräte allgemein', 'motor', 'akku'],
  [107, 'Anbaugeräte', 'motor', null],
  [108, 'Spritzen und Zubehör', 'motor', null],
  [109, 'Kehrmaschinen', 'motor', null],
  [110, 'Akku-Geräte AK', 'motor', 'akku'],
  [111, 'Akku-Geräte AP', 'motor', 'akku'],
  [120, 'Rasentraktoren Benzin', 'motor', 'benzin'],
  [121, 'Rasentraktoren Akku', 'motor', 'akku'],
  [122, 'Rasentraktoren Elektro', 'motor', 'elektro'],
  [130, 'Rasenmäher Benzin', 'motor', 'benzin'],
  [131, 'Rasenmäher Akku', 'motor', 'akku'],
  [132, 'Rasenmäher Elektro', 'motor', 'elektro'],
  [133, 'Vertikutierer', 'motor', null],
  [144, 'Gartengeräte', 'motor', null],
  [200, 'Erwachsenenfahrräder', 'fahrrad', null],
  [201, 'E-Bikes', 'fahrrad', 'akku'],
  [202, 'Kinderfahrräder', 'fahrrad', null],
  [203, 'Laufräder, Dreiräder & Co.', 'fahrrad', null],
  [204, 'Mountainbikes', 'fahrrad', null],
  [205, 'Dreiräder & E-Scooter', 'fahrrad', null],
  [206, 'Fahrradanhänger', 'fahrrad', null],
  [500, 'Elektromobile', 'elektromobil', 'akku'],
  // Kaercher (own file, same numbers as above, see applyCatalog).
  // CCE = devices for private customers, CPE = professional devices.
  [K + 100, 'Kärcher Privat – Allgemein', 'reinigung', null],
  [K + 101, 'Kärcher Privat – Hochdruckreiniger', 'reinigung', null],
  [K + 102, 'Kärcher Privat – Sauger', 'reinigung', null],
  [K + 103, 'Kärcher Privat – Bodenreiniger', 'reinigung', null],
  [K + 104, 'Kärcher Privat – Kehrmaschinen', 'reinigung', null],
  [K + 200, 'Kärcher Profi – Allgemein', 'reinigung', null],
  [K + 201, 'Kärcher Profi – Hochdruckreiniger', 'reinigung', null],
  [K + 202, 'Kärcher Profi – Sauger', 'reinigung', null],
  [K + 203, 'Kärcher Profi – Boden- & Dampfreiniger', 'reinigung', null],
  [K + 204, 'Kärcher Profi – Kehrmaschinen & Unkrautbürsten', 'reinigung', null],
  [K + 205, 'Kärcher Profi – Pumpen', 'reinigung', null],
];

// Manufacturer keywords seen in the Taifun names, plus article-number prefixes.
const BRANDS = [
  ['STIHL', ['stihl'], ['STI', 'JSTI'], 10],
  ['Honda', ['honda'], ['HON'], 20],
  ['Stiga', ['stiga'], ['STIG'], 20],
  ['Kress', ['kress'], ['KRE'], 20],
  ['Lumag', ['lumag'], ['LVG'], 20],
  ['Weibang', ['weibang'], ['RMV'], 20],
  ['SDMO', ['sdmo'], ['SDM'], 20],
  ['Solo', ['solo'], ['SOL'], 20],
  ['Tielbürger', ['tielbürger', 'tielbuerger'], ['TIE'], 20],
  ['Westermann', ['westermann'], ['WES'], 20],
  ['Zipper', ['zipper'], ['ZIP'], 20],
  ['Herkules', ['herkules'], ['TEL'], 20],
  ['Remarc', ['remarc'], ['REM'], 20],
  ['Cramer', ['cramer'], ['CRA'], 20],
  ['AL-KO', ['al-ko', 'alko'], ['ALK'], 20],
  ['Röder', ['röder', 'roeder'], ['ROE'], 20],
  ['MTD', ['mtd'], ['MTD'], 30],
  // "AS" is also a STIHL battery system - only checked after all others
  ['AS-Motor', ['as-motor', 'as motor'], ['AS'], 90],
  ['Kärcher', ['kärcher', 'kaercher'], [], 20],
  ['Bulls', ['bulls'], [], 20],
  ['Kalkhoff', ['kalkhoff'], [], 20],
];

async function ensureShopSeed() {
  // Adds groups that are missing; names changed in the database stay untouched
  const known = new Set((await ShopGroup.findAll({ attributes: ['nr'] })).map((g) => g.nr));
  const missing = GROUPS.filter(([nr]) => !known.has(nr));
  if (missing.length) {
    await ShopGroup.bulkCreate(missing.map(([nr, name, area, drive]) => ({ nr, name, area, drive })));
  }
  if ((await ShopBrand.count()) === 0) {
    await ShopBrand.bulkCreate(BRANDS.map(([name, keywords, prefixes, priority]) => ({ name, keywords, prefixes, priority })));
  }
}

module.exports = { ensureShopSeed, GROUPS, BRANDS };
