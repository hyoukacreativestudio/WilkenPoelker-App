// Prices from the Taifun stock export.
//
// - `Liste` is the list price WITHOUT VAT -> UVP = Liste x 1.19, to the cent.
// - `ListeBrutto` (older export format) is the same price WITH VAT.
// - `Ladenpreis` is our own price and already WITH VAT (439.00, 1159.00, ...);
//   0 means "no own price".
//
// Prices are never rounded to round amounts: 549.01 stays 549.01.

const VAT = 1.19;

const toCents = (v) => Math.round(Number(v) * 100);

// UVP with VAT from the export (prefers ListeBrutto when the file has it).
function uvpFromExport({ listNet, listGross }) {
  if (listGross != null && Number(listGross) > 0) return toCents(listGross) / 100;
  if (listNet == null || Number(listNet) <= 0) return null;
  return Math.round(toCents(listNet) * VAT) / 100;
}

// What the customer pays and whether it is an offer below the UVP.
function priceInfo({ uvp, shopPrice }) {
  const own = shopPrice != null && Number(shopPrice) > 0 ? toCents(shopPrice) / 100 : null;
  const price = own ?? uvp ?? null;
  const isOffer = own != null && uvp != null && own < uvp;
  return { price, uvp: uvp ?? null, isOffer };
}

module.exports = { VAT, uvpFromExport, priceInfo };
