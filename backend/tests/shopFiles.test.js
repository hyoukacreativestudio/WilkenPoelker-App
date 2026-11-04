const iconv = require('iconv-lite');
const {
  parseArticleXml, parseReservations, classifyFile, applyCatalog, KAERCHER_WHG_OFFSET: K,
} = require('../src/services/shop/taifunArticleParser');
const { isStockFile } = require('../src/services/shop/shopStockImport');
const { GROUPS } = require('../src/services/shop/shopSeed');

const art = (whg, text1) => ({ artNr: `A-${whg}`, whg, text1 });
const win = (s) => iconv.encode(s, 'win1252');
const xml = (body) => win(`<?xml version="1.0" encoding="windows-1252"?>${body}`);
const RES = '"{1DCEF177-AF80-4A68-AD8A-C827E709BF18}","ABU-10038276-01","1,00"\r\n';

describe('stock files: the content decides, not the name', () => {
  test('any xml/txt/csv is looked at', () => {
    for (const n of ['Art.-1.xml', 'bestand_100.xml', 'Reservierungen.TXT', 'x.csv']) expect(isStockFile(n)).toBe(true);
    for (const n of ['Art.pdf', 'liste.html', 'bild.png']) expect(isStockFile(n)).toBe(false);
  });

  test('articles and reservations are recognised', () => {
    expect(classifyFile(xml('<ArtList></ArtList>'))).toBe('articles');
    expect(classifyFile(win(RES))).toBe('reservations');
    expect(parseReservations(win(RES)).get('ABU-10038276-01')).toBe(1);
  });

  test('other text is not taken for reservations', () => {
    expect(classifyFile(win('"22608839","       0"\r\n'))).toBeNull();
    expect(classifyFile(win('"Hammer","12,50","3"\r\n'))).toBeNull();
    expect(classifyFile(win('irgendeine Notiz'))).toBeNull();
  });

  test('a file without <ArtList> is rejected, an empty list is fine', () => {
    expect(() => parseArticleXml(xml('<Other><Art/></Other>'))).toThrow(/ArtList/);
    expect(parseArticleXml(xml('<ArtList xmlns="urn:taifun-software.de:schema:TAIFUN"></ArtList>'))).toEqual([]);
  });
});

describe('Kaercher is a separate Taifun account with the same group numbers', () => {
  test('recognised by file name', () => {
    expect(applyCatalog([art(101, 'HD 5/15 C')], 'Kaercher-101.xml')[0]).toMatchObject({ whg: K + 101, catalog: 'kaercher' });
  });

  test('recognised by a configured file name, even if the texts do not say Kaercher', () => {
    expect(applyCatalog([art(101, 'HD 5/15 C')], 'CCE_101.xml', '^C[CP]E_')[0]).toMatchObject({ whg: K + 101, catalog: 'kaercher' });
    expect(applyCatalog([art(101, 'HD 5/15 C')], 'Art-101.xml', '^C[CP]E_')[0]).toMatchObject({ whg: 101, catalog: 'main' });
  });

  test('recognised by the article names', () => {
    const list = [art(201, 'Hochdruckreiniger Kärcher\nModell: HD 5/15 C'), art(201, 'Kaercher HDS 8/18'), art(201, 'Zubehör')];
    expect(applyCatalog(list, 'Art-201.xml').map((a) => a.whg)).toEqual([K + 201, K + 201, K + 201]);
  });

  test('other files stay in the main account, also with a single Kaercher article', () => {
    const list = [art(101, 'Akku-Blasgerät STIHL'), art(101, 'Motorsäge STIHL'), art(101, 'Kärcher Zubehör')];
    expect(applyCatalog(list, 'Art.-x.xml').map((a) => [a.whg, a.catalog])).toEqual([[101, 'main'], [101, 'main'], [101, 'main']]);
    expect(applyCatalog([], 'Art.-x.xml')).toEqual([]);
  });

  test('every Kaercher group from the list has its own name', () => {
    for (const nr of [100, 101, 102, 103, 104, 200, 201, 202, 203, 204, 205]) {
      expect(GROUPS.filter(([g, name]) => g === K + nr && name.startsWith('Kärcher'))).toHaveLength(1);
    }
    expect(GROUPS.find(([g]) => g === 101)[1]).toBe('Akku-Geräte AI + AS');
  });
});
