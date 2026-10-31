// Prices from the Taifun stock export.
//
// - `Liste` is the list price WITHOUT VAT -> UVP = Liste x 1.19.
// - `ListeBrutto` (older export format) is the same price WITH VAT.
// - `Ladenpreis` is our own price and already WITH VAT (439.00, 1159.00, ...);
//   0 means "no own price".
//
// Gross prices calculated from net ones often miss the intended round price by
// a cent (549.01 instead of 549.00, 1798.99 instead of 1799.00). Those are
// snapped to the full euro; every other price keeps its cents (2372.30 stays).
// Prices that were deliberately set like x.95 or x.50 are far from a full
// euro and are therefore not touched.

const VAT = 1.19;
const SNAP_CENTS = 3;

const toCents = (v) => Math.round(Number(v) * 100);

function roundShopPrice(gross) {
  if (gross == null || !Number.isFinite(Number(gross)) || Number(gross) <= 0) return null;
  const cents = toCents(gross);
  const rest = cents % 100;
  if (rest !== 0 && rest <= SNAP_CENTS) return (cents - rest) / 100;
  if (rest >= 100 - SNAP_CENTS) return (cents + (100 - rest)) / 100;
  return cents / 100;
}

// UVP with VAT from the export (prefers ListeBrutto when the file has it).
function uvpFromExport({ listNet, listGross }) {
  if (listGross != null && Number(listGross) > 0) return roundShopPrice(listGross);
  if (listNet == null || Number(listNet) <= 0) return null;
  return roundShopPrice(toCents(listNet) * VAT / 100);
}

// What the customer pays and whether it is an offer below the UVP.
function priceInfo({ uvp, shopPrice }) {
  const own = shopPrice != null && Number(shopPrice) > 0 ? roundShopPrice(shopPrice) : null;
  const price = own ?? uvp ?? null;
  const isOffer = own != null && uvp != null && own < uvp;
  return { price, uvp: uvp ?? null, isOffer };
}

module.exports = { VAT, roundShopPrice, uvpFromExport, priceInfo };
