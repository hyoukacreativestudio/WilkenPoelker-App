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

describe('only known Warengruppen go into the shop', () => {
  test('a device of a known group is stored', async () => {
    expect(await upsertArticles([art('STI-1', 105)], 'x.xml')).toEqual({ inserted: 1, updated: 0, ignored: 0 });
    expect(ShopArticle.create).toHaveBeenCalledTimes(1);
  });

  test('no group and an unlisted group are ignored', async () => {
    const r = await upsertArticles([art('ZEG-speiche', 268), art('ABU-helm', 243), art('RAT-kette', null)], 'x.xml');
    expect(r).toEqual({ inserted: 0, updated: 0, ignored: 3 });
    expect(ShopArticle.create).not.toHaveBeenCalled();
  });

  test('an older export without group keeps the known group of the stored article', async () => {
    const update = jest.fn();
    ShopArticle.findOne.mockResolvedValue({ whg: 105, update });
    const r = await upsertArticles([art('STI-2', null)], 'alt.xml');
    expect(r).toEqual({ inserted: 0, updated: 1, ignored: 0 });
    expect(update.mock.calls[0][0].whg).toBe(105);
  });

  test('a stored spare part without group is not updated again', async () => {
    const update = jest.fn();
    ShopArticle.findOne.mockResolvedValue({ whg: null, update });
    expect((await upsertArticles([art('RAT-kette', null)], 'x.xml')).ignored).toBe(1);
    expect(update).not.toHaveBeenCalled();
  });
});
