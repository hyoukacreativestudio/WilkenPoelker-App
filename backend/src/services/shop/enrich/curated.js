const path = require('path');
const fs = require('fs');

// Manufacturer data researched once on the official manufacturer websites, for
// brands whose pages cannot be matched automatically (Honda, Stiga, Kress ...).
// Matched by the Taifun article number. File: src/data/shopOfficialData.json
// [{ artNrs: [], officialUrl, officialName, images: [urls], specs: [[k, v]] }]
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

async function findOfficial(product, articles) {
  const map = load();
  for (const a of articles) {
    const e = map.get(String(a.artNr).toUpperCase());
    if (e) {
      return { url: e.officialUrl, name: e.officialName || null, images: (e.images || []).slice(0, 8), specs: e.specs || [] };
    }
  }
  return null;
}

module.exports = { findOfficial, load };
