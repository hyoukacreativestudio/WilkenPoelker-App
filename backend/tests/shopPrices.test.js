const { roundShopPrice, uvpFromExport, priceInfo } = require('../src/services/shop/prices');

describe('shop prices', () => {
  test('net list price -> gross UVP', () => {
    expect(uvpFromExport({ listNet: 671.43 })).toBe(799);
    expect(uvpFromExport({ listNet: 452.94 })).toBe(539);
  });

  test('a cent off a full euro is snapped', () => {
    expect(uvpFromExport({ listNet: 461.35 })).toBe(549); // 549.01
    expect(roundShopPrice(1798.99)).toBe(1799);
    expect(roundShopPrice(459.02)).toBe(459);
  });

  test('real cents and deliberate endings are kept', () => {
    expect(uvpFromExport({ listNet: 1993.53 })).toBe(2372.3);
    expect(roundShopPrice(449.95)).toBe(449.95);
    expect(roundShopPrice(868.7)).toBe(868.7);
  });

  test('ListeBrutto wins when present', () => {
    expect(uvpFromExport({ listNet: 461.35, listGross: 549.01 })).toBe(549);
  });

  test('missing prices', () => {
    expect(uvpFromExport({ listNet: 0 })).toBeNull();
    expect(priceInfo({ uvp: null, shopPrice: 0 })).toEqual({ price: null, uvp: null, isOffer: false });
  });

  test('own price is an offer only below the UVP', () => {
    expect(priceInfo({ uvp: 539, shopPrice: 439 })).toEqual({ price: 439, uvp: 539, isOffer: true });
    expect(priceInfo({ uvp: 449, shopPrice: 0 })).toEqual({ price: 449, uvp: 449, isOffer: false });
    expect(priceInfo({ uvp: 449, shopPrice: 469 })).toEqual({ price: 469, uvp: 449, isOffer: false });
  });
});
