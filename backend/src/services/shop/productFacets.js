// What the product filters can read out of the technical data. Taifun and the
// manufacturer pages write the same thing in many ways ("300 mm", "30cm", "Max. 4 cm");
// this turns them into clean values, and only for what matters per device.

const plain = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

// The one size that decides the purchase, per device. Devices without a meaningful
// size (Laubbläser, Kombigeräte ...) have no entry and show no size filter.
const CUT = { label: 'Schnittlänge', re: /^(schnittl|schienenl)/, unit: 'cm' };
const WIDTH = { label: 'Arbeitsbreite', re: /^arbeitsbreite/, unit: 'cm' };
const TANK = { label: 'Behälter', re: /^behaelter/, unit: 'l' };
const SIZES = {
  Motorsägen: CUT,
  Hochentaster: CUT,
  'Gehölzschneider & Astscheren': CUT,
  Heckenscheren: CUT,
  'Freischneider & Motorsensen': { label: 'Schneidkreis', re: /^schneidkreis/, unit: 'mm' },
  Rasentrimmer: { label: 'Schnittbreite', re: /^(schnittbreite|schneidkreis)/, unit: 'cm' },
  'Rasenmäher & Balkenmäher': { label: 'Schnittbreite', re: /^schnittbreite/, unit: 'cm' },
  Kehrmaschinen: WIDTH,
  Radialbesen: WIDTH,
  Wildkrautentfernung: WIDTH,
  'Motorhacken & Bodenfräsen': WIDTH,
  'Vertikutierer & Lüfter': WIDTH,
  'Schneefräsen & Räumschilder': WIDTH,
  Trennschleifer: { label: 'Trennscheibe', re: /^trenn(schleif)?scheibe/, unit: 'mm' },
  Häcksler: { label: 'Aststärke', re: /^(max\.? )?ast(staerke|durchmesser)/, unit: 'mm' },
  Hochdruckreiniger: { label: 'Max. Druck', re: /^max\.? druck/, unit: 'bar' },
  Spritzgeräte: TANK,
  Sauger: TANK,
  Kompressoren: { label: 'Kessel', re: /^kessel/, unit: 'l' },
  Holzspalter: { label: 'Spaltkraft', re: /^spaltkraft/, unit: 't' },
  Rüttelplatten: { label: 'Gewicht', re: /^(betriebs)?gewicht/, unit: 'kg' },
  Stromerzeuger: { label: 'Leistung', re: /^(max\.? leistung|leistung max)/, unit: 'kW', decimals: 1 },
  'E-Bikes': { label: 'Rahmenhöhe', re: /^rahmenh/, unit: 'cm' },
  Mountainbikes: { label: 'Rahmenhöhe', re: /^rahmenh/, unit: 'cm' },
  Fahrräder: { label: 'Rahmenhöhe', re: /^rahmenh/, unit: 'cm' },
};

const TO_BASE = {
  mm: { mm: 1, cm: 10, m: 1000 },
  cm: { mm: 0.1, cm: 1, m: 100 },
  l: { l: 1, liter: 1, ltr: 1 },
  kg: { kg: 1 },
  bar: { bar: 1 },
  t: { t: 1 },
  kW: { kw: 1, w: 0.001 },
};

// "2.200" is two thousand, "2.2" and "2,2" are two point two
const toNumber = (s) => Number(/^\d{1,3}\.\d{3}$/.test(s) ? s.replace('.', '') : s.replace(',', '.'));

// "45 / 60 cm" -> [45, 60]; "Max. 4 cm" as mm -> [40]; "35 cm (42 cm)" -> [35]
function readSizes(value, label, cfg) {
  const factors = TO_BASE[cfg.unit];
  const text = String(value).toLowerCase().replace(/\(.*$/, ' ');
  const unitInLabel = String(label).toLowerCase().match(/\((\w+)\)/)?.[1];
  const found = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*([a-zä]*)/g)];
  const unit = found.map((m) => m[2]).find((u) => factors[u]) || (factors[unitInLabel] ? unitInLabel : null);
  if (!unit) return [];
  const round = 10 ** (cfg.decimals || 0);
  return found
    .filter((m) => !m[2] || factors[m[2]])
    .map((m) => Math.round(toNumber(m[1]) * factors[m[2] || unit] * round) / round)
    .filter((v) => v > 0);
}

const unitLabel = (v, cfg) => `${String(v).replace('.', ',')} ${cfg.unit}`;

// specLists: [[label, value], ...] from all variants and the manufacturer page
function sizesOf(device, specLists) {
  const cfg = SIZES[device];
  if (!cfg) return { label: null, values: [] };
  const values = new Set();
  specLists.forEach((specs) => (specs || []).forEach(([k, v]) => {
    if (cfg.re.test(plain(k))) readSizes(v, k, cfg).forEach((n) => values.add(n));
  }));
  return {
    label: cfg.label,
    values: [...values].sort((a, b) => a - b).map((n) => ({ value: String(n), label: unitLabel(n, cfg), sort: n })),
  };
}

const COLORS = [
  [/schwarz/, 'Schwarz'], [/weiss/, 'Weiß'], [/grau|anthrazit/, 'Grau'], [/silber/, 'Silber'], [/\brot\b|\brot\//, 'Rot'],
  [/blau/, 'Blau'], [/gruen/, 'Grün'], [/gelb/, 'Gelb'], [/orange/, 'Orange'], [/braun/, 'Braun'], [/beige|sand/, 'Beige'],
];

// Colour only where it is stated: the colour line, or a colour word in an accessory name
function colorsOf(title, specLists) {
  const sources = [];
  specLists.forEach((specs) => (specs || []).forEach(([k, v]) => {
    if (/farbe/.test(plain(k))) sources.push(plain(v));
  }));
  if (/\b(GELB|ROT|BLAU|GRUEN|GRÜN|SCHWARZ|WEISS)\b/.test(String(title))) sources.push(plain(title));
  const out = new Set();
  sources.forEach((s) => COLORS.forEach(([re, name]) => { if (re.test(s)) out.add(name); }));
  return [...out];
}

// The manufacturer page often knows the drive when the Taifun text does not say it
function driveFromSpecs(specs) {
  const labels = new Map((specs || []).map(([k, v]) => [plain(k), plain(v)]));
  const fuel = labels.get('kraftstoff') || labels.get('betriebsart') || labels.get('leistungsquelle') || '';
  if (/diesel/.test(fuel)) return 'diesel';
  if (/benzin/.test(fuel)) return 'benzin';
  if (/akku/.test(fuel) || labels.has('akku-system') || labels.has('empfohlener akku')) return 'akku';
  if ([...labels.keys()].some((k) => k.startsWith('hubraum') || k.startsWith('tankinhalt'))) return 'benzin';
  if (/2[23]\d/.test(labels.get('nennspannung') || labels.get('spannung') || '')) return 'elektro';
  return null;
}

function systemFromSpecs(specs) {
  const row = (specs || []).find(([k]) => plain(k) === 'akku-system');
  const m = row && String(row[1]).toUpperCase().match(/\b(AP|AK|AS|AI)\b/);
  return m ? m[1] : null;
}

module.exports = { plain, sizesOf, colorsOf, driveFromSpecs, systemFromSpecs, readSizes, SIZES };
