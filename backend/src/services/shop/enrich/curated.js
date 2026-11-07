const path = require('path');
const fs = require('fs');

// Manufacturer data researched once on the official manufacturer websites, for
// brands whose pages cannot be matched automatically (Honda, Stiga, Kress ...).
// Matched by the Taifun article number. File: src/data/shopOfficialData.json
// [{ artNrs: [], officialUrl, officialName, images: [urls], specs: [[k, v]], match? }]
// match: 'model' = same type, but the manufacturer's number could not be confirmed
const FILE = path.resolve(__dirname, '../../../data/shopOfficialData.json');

let byArtNr = null;
function load() {
  if (byArtNr) return byArtNr;
  byArtNr = new Map();
  let list = [];
  try { list = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { list = []; }
  for (const e of list) {
    if (!e || !e.officialUrl || !(e.images?.length || e.specs?.length)) continue;
    for (const nr of e.artNrs || []) byArtNr.set(String(nr).toUpperCase(), e);
  }
  return byArtNr;
}

// An image is a URL, or { url, artNrs } for a picture that shows only some
// variants (bike in another frame shape or colour). Up to 8 pictures, or 24 when
// the pictures are split by variant.
async function findOfficial(product, articles) {
  const map = load();
  for (const a of articles) {
    const e = map.get(String(a.artNr).toUpperCase());
    if (e) {
      const list = (e.images || []).map((img) => (typeof img === 'string' ? { url: img } : img)).filter((img) => img && img.url);
      const perVariant = list.some((img) => img.artNrs?.length);
      const images = list.slice(0, perVariant ? 24 : 8);
      return {
        url: e.officialUrl,
        name: e.officialName || null,
        images: images.map((img) => img.url),
        imageArtNrs: perVariant ? images.map((img) => (img.artNrs || []).map((n) => String(n).toUpperCase())) : null,
        specs: e.specs || [],
        match: e.match,
      };
    }
  }
  return null;
}

module.exports = { findOfficial, load };
