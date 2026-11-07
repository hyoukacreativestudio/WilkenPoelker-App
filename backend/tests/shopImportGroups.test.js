jest.mock('../src/models', () => ({
  sequelize: {},
  ShopArticle: { findOne: jest.fn(), create: jest.fn() },
  ShopProduct: {},
  ShopBrand: { count: jest.fn(async () => 1), bulkCreate: jest.fn() },
  ShopGroup: { findAll: jest.fn(), bulkCreate: jest.fn() },
}));

const { ShopArticle, ShopGroup } = require('../src/models');
const { upsertArticles } = require('../src/services/shop/shopCatalog');
const { GROUPS } = require('../src/services/shop/shopSeed');

const art = (artNr, whg) => ({ artNr, whg, text1: artNr });

beforeEach(() => {
  ShopArticle.findOne.mockReset().mockResolvedValue(null);
  ShopArticle.create.mockReset();
  ShopGroup.findAll.mockResolvedValue([...GROUPS.map(([nr]) => ({ nr }))]);
});

// User decision 2026-11-07: only the Warengruppen the shop sent go in, no
// Zubehör / spare parts; our own internal numbers (WP-...) never.
describe('only the listed Warengruppen go into the shop', () => {
  test('a device of a listed group is stored', async () => {
    expect(await upsertArticles([art('STI-1', 105)], 'x.xml')).toEqual({ inserted: 1, updated: 0, ignored: 0 });
    expect(ShopArticle.create).toHaveBeenCalledTimes(1);
  });

  test('spare parts and accessories without or with an unlisted group stay out', async () => {
    const r = await upsertArticles([art('ZEG-speiche', 268), art('ABU-helm', 243), art('RAT-kette', null)], 'x.xml');
    expect(r).toEqual({ inserted: 0, updated: 0, ignored: 3 });
    expect(ShopArticle.create).not.toHaveBeenCalled();
  });

  test('internal numbers (Fracht, Besichtigung) are no products', async () => {
    const r = await upsertArticles([art('WP-913', 105), art('wp-531', null)], 'x.xml');
    expect(r).toEqual({ inserted: 0, updated: 0, ignored: 2 });
  });

  test('an older export without group keeps the known group of the stored article', async () => {
    const update = jest.fn();
    ShopArticle.findOne.mockResolvedValue({ whg: 105, update });
    const r = await upsertArticles([art('STI-2', null)], 'alt.xml');
    expect(r).toEqual({ inserted: 0, updated: 1, ignored: 0 });
    expect(update.mock.calls[0][0].whg).toBe(105);
  });
});
