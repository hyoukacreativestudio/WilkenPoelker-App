const iconv = require('iconv-lite');
const { parseArticleXml, parseReservations } = require('../src/services/shop/taifunArticleParser');
const G = require('../src/services/shop/productGrouping');
const { BRANDS } = require('../src/services/shop/shopSeed');

const brands = BRANDS.map(([name, keywords, prefixes, priority]) => ({ name, keywords, prefixes, priority }));

const XML = `<?xml version="1.0" encoding="windows-1252"?><ArtList xmlns="urn:taifun-software.de:schema:TAIFUN">
<Art><DatePut>2026-10-17</DatePut><Nr>STI-MA032000021</Nr><WHG>102</WHG><Kurztext>x</Kurztext><Liste>402.52</Liste><Ladenpreis>0.00</Ladenpreis>
<ArtBestandList><ArtBestand><Ist>2.00</Ist></ArtBestand></ArtBestandList>
<ArtUDF01><GUID>{AAAA-1}</GUID><ArtNr>STI-MA032000021</ArtNr><Text1>Akku Motors&#228;ge STIHL
Modell: MSA 220 C-B</Text1><Text2>- Schienenl&#228;nge:	35 cm
- Gewicht:	3,6 kg</Text2></ArtUDF01></Art>
<Art><DatePut>2026-10-17</DatePut><Nr>STI-MA032000085</Nr><WHG>102</WHG><Liste>411.76</Liste><Ladenpreis>469.00</Ladenpreis>
<ArtBestandList><ArtBestand><Ist>0.00</Ist></ArtBestand></ArtBestandList>
<ArtUDF01><GUID>{AAAA-2}</GUID><ArtNr>STI-MA032000085</ArtNr><Text1>Akku Motorsäge STIHL
Modell: MSA 220 C-B</Text1><Text2>- Schienenlänge:	40 cm
- Gewicht:	3,6 kg</Text2></ArtUDF01></Art>
<Art><DatePut>2026-08-21</DatePut><Nr>LVG-RAMBOHC15L</Nr><WHG>100</WHG><Kurztext>Benzin Häcksler Lumag
Modell: Rambo HC 15
Seriennr.:
Motor: 15 PS</Kurztext><Liste>1000.00</Liste><Ladenpreis>0.00</Ladenpreis></Art>
</ArtList>`;

describe('Taifun stock export', () => {
  const arts = parseArticleXml(iconv.encode(XML, 'win1252'));

  test('reads both article layouts', () => {
    expect(arts).toHaveLength(3);
    expect(arts[0]).toMatchObject({ guid: 'AAAA-1', artNr: 'STI-MA032000021', whg: 102, stock: 2, listNet: 402.52 });
    expect(arts[0].text1).toBe('Akku Motorsäge STIHL\nModell: MSA 220 C-B');
    expect(arts[2]).toMatchObject({ guid: null, artNr: 'LVG-RAMBOHC15L', stock: null });
  });

  test('brand, category, model and group key', () => {
    const b = G.detectBrand(arts[0], brands);
    expect(b.name).toBe('STIHL');
    expect(G.extractModel(arts[0])).toBe('MSA 220 C-B');
    expect(G.extractCategory(arts[0], b)).toBe('Akku Motorsäge');
    expect(G.groupKeyFor(arts[0], b, 'MSA 220 C-B')).toBe(G.groupKeyFor(arts[1], b, 'MSA 220 C-B'));
    const lumag = G.detectBrand(arts[2], brands);
    expect(lumag.name).toBe('Lumag');
    expect(G.extractModel(arts[2])).toBe('Rambo HC 15');
  });

  test('variants are told apart by the differing value', () => {
    const labels = G.variantLabels([arts[0], arts[1]]);
    expect(labels.get('STI-MA032000021')).toBe('Schienenlänge 35 cm');
    expect(labels.get('STI-MA032000085')).toBe('Schienenlänge 40 cm');
  });

  test('drive words are not part of the category filter', () => {
    expect(G.baseCategory('Akku-Blasgerät')).toBe('Blasgerät');
    expect(G.baseCategory('Elektro- Freischneider')).toBe('Freischneider');
    expect(G.baseCategory('Akkuspritzgerät')).toBe('Spritzgerät');
    expect(G.categoryKey('Benzin Freischneider')).toBe(G.categoryKey('Akku Freischneider'));
  });

  test('Set / Grundgerät / battery system are variants of one model', () => {
    expect(G.baseModel('GTA 26 Set AS 2 System')).toBe('GTA 26');
    expect(G.baseModel('GTA 26 Grundgerät AS System')).toBe('GTA 26');
    expect(G.baseModel('HSA 130 R Grundgerät AP / AR System')).toBe('HSA 130 R');
    expect(G.baseModel('MSA 220 C-B')).toBe('MSA 220 C-B');
    const a = { artNr: 'STI-1', text1: 'Akku Gehölzschneider STIHL\nModell: GTA 26 Set AS 2 System' };
    const b = { artNr: 'STI-2', text1: 'Akku Gehölzschneider STIHL\nModell: GTA 26 Grundgerät AS System' };
    const labels = G.variantLabels([a, b]);
    expect(labels.get('STI-1')).toBe('Set AS 2 System');
    expect(labels.get('STI-2')).toBe('Grundgerät AS System');
  });

  test('device names from Taifun end up in groups a customer understands', () => {
    expect(G.deviceGroup('Motorsäge Sondermodell 100 Jahre')).toBe('Motorsägen');
    expect(G.deviceGroup('Heckenschneider')).toBe('Heckenscheren');
    expect(G.deviceGroup('Saughäcksler')).toBe('Häcksler');
    expect(G.deviceGroup('Laubsauger Q')).toBe('Laubbläser & Laubsauger');
    expect(G.deviceGroup('Nass & Trockensauger')).toBe('Sauger');
    expect(G.deviceGroup('DUESE FL.STRAHL. 30-04F110 ROT, POM')).toBe('Zubehör & Sonstiges');
    expect(G.deviceGroup('Trennschleifer')).toBe('Trennschleifer');
    expect(G.deviceGroup('Motor: 350 W')).toBe('Zubehör & Sonstiges');
  });

  test('specs from Kurztext skip name and serial lines', () => {
    expect(G.parseSpecs(arts[2]).specs).toEqual([['Motor', '15 PS']]);
  });

  test('"AS" battery system does not make a STIHL product AS-Motor', () => {
    const a = { artNr: 'STI-BA080115910', text1: 'Akku-Blasgerät STIHL\nModell: BGA 30 Set AS System' };
    expect(G.detectBrand(a, brands).name).toBe('STIHL');
    expect(G.detectBatterySystem(a.text1)).toBe('AS');
    expect(G.detectBrand({ artNr: 'AS-G07300114', text1: 'Wildkrautentferner AS\nModell: AS 30' }, brands).name).toBe('AS-Motor');
  });

  test('reservations are summed per article number', () => {
    const g = (n) => `{1DCEF177-AF80-4A68-AD8A-C827E709BF1${n}}`;
    const csv = `"${g(1)}","WP-900","1,00"\r\n"${g(2)}","WP-900","0,50"\r\n"${g(3)}","STI-1","2,00"\r\n`;
    const sums = parseReservations(iconv.encode(csv, 'win1252'));
    expect(sums.get('WP-900')).toBe(1.5);
    expect(sums.get('STI-1')).toBe(2);
  });
});
