const { lookOf, imagesForLook } = require('../src/services/shop/productFacets');
const curated = require('../src/services/shop/enrich/curated');

describe('pictures per variant (frame shape / colour)', () => {
  test('look = frame shape + colour, size does not matter', () => {
    expect(lookOf([['Rahmenh./Form', '29"/ 58 cm / Herren'], ['Rahmenfarbe', 'Schwarz']])).toBe('Herren · Schwarz');
    expect(lookOf([['Rahmenh./Form', '29"/ 53 cm / Wave'], ['Rahmenfarbe', 'midnightplum matt']])).toBe('Wave · midnightplum matt');
    expect(lookOf([['Rahmenh./Form', '29"/ 58 cm / Wave'], ['Rahmenfarbe', 'midnightplum matt']])).toBe('Wave · midnightplum matt');
    expect(lookOf([['Rahmenh./Form', '28"/ 50 cm']])).toBeNull();
    expect(lookOf([['Farbe', 'rot']])).toBe('rot');
    expect(lookOf([['Schienenlänge', '40 cm']])).toBeNull();
  });

  const imgs = [
    { url: 'a', look: 'Herren · Schwarz' },
    { url: 'b', look: 'Wave · Schwarz' },
    { url: 'c' },
    { url: 'd', look: 'Wave · Schwarz' },
  ];

  test('own pictures first, then the general ones', () => {
    expect(imagesForLook(imgs, 'Wave · Schwarz').map((i) => i.url)).toEqual(['b', 'd', 'c']);
    expect(imagesForLook(imgs, 'Herren · Schwarz').map((i) => i.url)).toEqual(['a', 'c']);
  });

  test('no own pictures, no look or untagged pictures: everything', () => {
    expect(imagesForLook(imgs, 'Trapez · Blau').map((i) => i.url)).toEqual(['a', 'b', 'c', 'd']);
    expect(imagesForLook(imgs, null).map((i) => i.url)).toEqual(['a', 'b', 'c', 'd']);
    expect(imagesForLook([{ url: 'x' }], 'Wave · Schwarz').map((i) => i.url)).toEqual(['x']);
  });

  test('curated data: Kalkhoff Image 3 has its pictures per variant', async () => {
    const page = await curated.findOfficial({}, [{ artNr: 'DER-D690521207' }]);
    expect(page.images.length).toBe(15);
    expect(page.imageArtNrs.length).toBe(15);
    expect(page.imageArtNrs[0]).toEqual(['DER-D690521193']);
    expect(page.imageArtNrs[14]).toEqual(['DER-D690521207', 'DER-D690521208']);
    expect(page.images.every((u) => typeof u === 'string' && u.startsWith('https://'))).toBe(true);
  });

  test('curated data: plain picture lists stay as before', () => {
    const list = require('../src/data/shopOfficialData.json');
    const bad = list.filter((e) => (e.images || []).some((img) => !(typeof img === 'string' || (img && typeof img.url === 'string'))));
    expect(bad.map((e) => e.title)).toEqual([]);
  });
});
