// Turns Taifun article texts into product data: brand, category, model,
// technical data, the key that groups variants onto one page, and the label
// that tells the variants apart. Pure functions - no database access.

const clean = (s) => String(s || '').replace(/\t+/g, ' ').replace(/[  ]+/g, ' ').trim();
const lines = (s) => String(s || '').split('\n').map(clean).filter(Boolean);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text1, or the start of the Kurztext when Text1 is missing.
function nameLines(article) {
  const src = article.text1 || article.kurztext || '';
  return lines(src).filter((l) => !/^(serien|s\/n)/i.test(l)).slice(0, article.text1 ? 3 : 2);
}

// brands: [{ name, keywords: [], prefixes: [], priority }]
// The first name line ("Radialbesen Westermann") wins over later lines
// ("Modell: WR 870 Honda" - that is the engine, not the manufacturer).
function detectBrand(article, brands) {
  const names = nameLines(article);
  const sorted = [...brands].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  for (const head of [names[0] || '', names.join(' ')]) {
    for (const b of sorted) {
      for (const kw of b.keywords || []) {
        if (kw && new RegExp(`(^|[^\\p{L}\\d])${esc(kw)}($|[^\\p{L}\\d])`, 'iu').test(head)) return b;
      }
    }
  }
  const prefix = String(article.artNr || '').split('-')[0].toUpperCase();
  return sorted.find((b) => (b.prefixes || []).map((p) => p.toUpperCase()).includes(prefix)) || null;
}

function extractModel(article) {
  for (const l of nameLines(article)) {
    const m = l.match(/^modell\s*:?\s*(.+)$/i);
    if (m && m[1].trim()) return clean(m[1]);
  }
  return null;
}

// "Akku Motorsäge" from "Akku Motorsäge STIHL"
function extractCategory(article, brand) {
  let first = nameLines(article)[0] || '';
  if (/^modell/i.test(first)) first = '';
  if (brand) {
    for (const kw of [brand.name, ...(brand.keywords || []), ...(brand.prefixes || [])]) {
      first = first.replace(new RegExp(`(^|\\s)${esc(kw)}:?(?=\\s|$)`, 'iu'), ' ');
    }
  }
  first = clean(first.replace(/\s+-\s+/g, ' ').replace(/^:\s*/, ''));
  return first || null;
}

// Device type without the drive, which is a filter of its own:
// "Akku-Blasgerät", "Benzin Blasgerät", "Akkublasgerät" -> "Blasgerät"
function baseCategory(c) {
  let s = clean(String(c || '').replace(/-\s+/g, '-'));
  for (let i = 0; i < 3; i += 1) {
    s = s.replace(/^(akku|benzin|elektro|diesel)(\s*-\s*|\s+)/i, '')
      .replace(/^akku(?=[a-zäöü]{4,})/i, '');
  }
  s = s.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : null;
}
// Same category spelled differently -> one key
const categoryKey = (c) => {
  const base = baseCategory(c);
  return base ? base.toLowerCase().replace(/ß/g, 'ss').replace(/&/g, 'und').replace(/[^a-zäöü0-9]/g, '') : null;
};

// Package words are variants, not products: "GTA 26 Set AS 2 System" and
// "GTA 26 Grundgerät AS System" are both the GTA 26.
function baseModel(model) {
  if (!model) return null;
  const s = clean(String(model)
    .replace(/\b(ALLPRO|AK|AP|AS|AI|AR)(\s*\d)?(\s*\/\s*(ALLPRO|AK|AP|AS|AI|AR))*\s*-?\s*System\b/gi, ' ')
    .replace(/\b(grundger(ä|ae)t|set|ohne akku.*|mit akku.*|inkl\..*)$/gi, ' ')
    .replace(/\b(grundger(ä|ae)t|set)\b/gi, ' '));
  return s || clean(model);
}
const modelKey = (m) => String(m || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');

// Own page for one article; article numbers are unique per Taifun account only
const singleArticleKey = (article) => `art|${article.catalog === 'kaercher' ? 'k|' : ''}${article.artNr}`;

// The device name comes straight from Taifun and is often one of a kind ("DUESE
// FL.STRAHL.02F80 GELB"). For the filter, devices are grouped into what a customer
// looks for; the first match wins, the rest is accessories.
const DEVICE_GROUPS = [
  [/maehroboter|robi|imow/, 'Mähroboter'],
  [/rasentraktor|aufsitz/, 'Rasentraktoren'],
  [/vertikut|aerifiz|luefter/, 'Vertikutierer & Lüfter'],
  [/duese|verlaengerung|teleskoprohr|fahrwagen|gegengewicht|winkelgetriebe|handven|saugschlauch|schaft|rueckentrage|kehrgut|spritzschirm/, 'Zubehör & Sonstiges'],
  [/maeher|maehbalken/, 'Rasenmäher & Balkenmäher'],
  [/trenn(schneider|schleifer)/, 'Trennschleifer'],
  [/motorsaege|kettensaege|wippsaege|wippkreissaege/, 'Motorsägen'],
  [/hochentaster/, 'Hochentaster'],
  [/gehoelzschneider|astschere|^asa /, 'Gehölzschneider & Astscheren'],
  [/heckensch|strauchschere/, 'Heckenscheren'],
  [/freischneider|sense/, 'Freischneider & Motorsensen'],
  [/trimmer|kantenschneider/, 'Rasentrimmer'],
  [/blasgeraet|blaeser|laubsauger/, 'Laubbläser & Laubsauger'],
  [/haecksler/, 'Häcksler'],
  [/kehrmaschine/, 'Kehrmaschinen'],
  [/druckreiniger/, 'Hochdruckreiniger'],
  [/sauger/, 'Sauger'],
  [/bodenreiniger|dampfreiniger/, 'Boden- & Dampfreiniger'],
  [/kombi|multiwerkzeug/, 'Kombigeräte'],
  [/stromerzeuger|stromversorgung/, 'Stromerzeuger'],
  [/kompressor/, 'Kompressoren'],
  [/holzspalter/, 'Holzspalter'],
  [/ruettel/, 'Rüttelplatten'],
  [/spritz/, 'Spritzgeräte'],
  [/wildkraut/, 'Wildkrautentfernung'],
  [/motorhacke|bodenfraese/, 'Motorhacken & Bodenfräsen'],
  [/erdbohr|bohrgeraet/, 'Erdbohrer'],
  [/schnee/, 'Schneefräsen & Räumschilder'],
  [/pumpe/, 'Pumpen'],
  [/einachs/, 'Einachser'],
  [/radialbesen/, 'Radialbesen'],
  [/e-bike|ebike|pedelec/, 'E-Bikes'],
  [/mountain|mtb/, 'Mountainbikes'],
  [/bike|fahrrad|trekking|citybike/, 'Fahrräder'],
];

// The first filter level: what kind of thing is it? Fixed order, accessories last.
const MAIN_GROUPS = [
  ['Sägen & Holz', ['Motorsägen', 'Hochentaster', 'Gehölzschneider & Astscheren', 'Holzspalter']],
  ['Rasen & Wiese', ['Rasenmäher & Balkenmäher', 'Mähroboter', 'Rasentraktoren', 'Rasentrimmer', 'Freischneider & Motorsensen', 'Vertikutierer & Lüfter']],
  ['Hecke & Garten', ['Heckenscheren', 'Häcksler', 'Motorhacken & Bodenfräsen', 'Einachser', 'Spritzgeräte', 'Kombigeräte']],
  ['Laub, Kehren & Winter', ['Laubbläser & Laubsauger', 'Kehrmaschinen', 'Radialbesen', 'Wildkrautentfernung', 'Schneefräsen & Räumschilder']],
  ['Reinigen', ['Hochdruckreiniger', 'Sauger', 'Boden- & Dampfreiniger']],
  ['Bau & Werkstatt', ['Trennschleifer', 'Rüttelplatten', 'Kompressoren', 'Stromerzeuger', 'Pumpen', 'Erdbohrer']],
  ['Fahrräder', ['E-Bikes', 'Mountainbikes', 'Fahrräder']],
  ['Zubehör', ['Zubehör & Sonstiges']],
];
const MAIN_OF = new Map(MAIN_GROUPS.flatMap(([main, devices]) => devices.map((d) => [d, main])));
const mainGroup = (device) => MAIN_OF.get(device) || 'Zubehör';
const MAIN_ORDER = MAIN_GROUPS.map(([main]) => main);

function deviceGroup(category) {
  const text = String(category || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const hit = DEVICE_GROUPS.find(([re]) => re.test(text));
  return hit ? hit[1] : 'Zubehör & Sonstiges';
}

function groupKeyFor(article, brand, model) {
  if (article.manualGroupKey) return article.manualGroupKey;
  if (!model) return singleArticleKey(article);
  return `${(brand?.name || 'unbekannt').toLowerCase()}|${modelKey(baseModel(model))}`;
}

function slugify(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'produkt';
}

// Technical data from Text2 (or the Kurztext without the name lines).
// Returns { specs: [[label, value]], notes: [text] }.
const SKIP_LABEL = /^(serien|s\/n|seriennr|modell)/i;
function parseSpecs(article) {
  const source = article.text2 || '';
  let rows = lines(source);
  if (!article.text2 && article.kurztext) {
    const name = new Set(nameLines(article));
    rows = lines(article.kurztext).filter((l) => !name.has(l));
  }
  const specs = [];
  const notes = [];
  for (let row of rows) {
    row = row.replace(/^[-•*]\s*/, '').trim();
    if (!row) continue;
    const m = row.match(/^([^:]{2,40}?)\s*:\s*(.*)$/);
    if (m) {
      const label = clean(m[1]);
      const value = clean(m[2]);
      if (SKIP_LABEL.test(label)) continue;
      if (!value) { notes.push(label); continue; }
      specs.push([label, value]);
    } else {
      notes.push(row);
    }
  }
  return { specs, notes };
}

// Drive and battery system for the filters (WHG first, then the name).
function detectDrive(text, groupDrive) {
  if (groupDrive) return groupDrive;
  const t = String(text || '').toLowerCase();
  if (/\bakku|akku-|\bakkuger|\bbattery/.test(t)) return 'akku';
  if (/\bdiesel/.test(t)) return 'diesel';
  if (/\bbenzin|4[- ]?takt|2[- ]?takt|\bb&s\b|briggs|ccm|\bps\b/.test(t)) return 'benzin';
  if (/\belektro|230\s*v\b|netz/.test(t)) return 'elektro';
  return null;
}
function detectBatterySystem(text) {
  const t = String(text || '');
  const m = t.match(/\b(ALLPRO|AK|AP|AS|AI)[- ]?(?:System|-System)\b/i) || t.match(/\b(ALLPRO)\b/i);
  return m ? m[1].toUpperCase() : null;
}

// Label per variant: the package words of the model (Set / Grundgerät ...)
// plus the technical values that differ inside the group, else the name words
// that differ, else the article number.
function variantLabels(articles) {
  if (articles.length <= 1) return new Map(articles.map((a) => [a.artNr, null]));
  const suffixes = articles.map((a) => {
    const m = extractModel(a);
    const b = baseModel(m);
    return m && b ? clean(m.slice(m.toLowerCase().indexOf(b.toLowerCase()) + b.length)) || clean(m.replace(b, '')) : '';
  });
  const useSuffix = new Set(suffixes).size > 1;
  const parsed = articles.map((a) => new Map(parseSpecs(a).specs.map(([k, v]) => [k.toLowerCase(), [k, v]])));
  const labels = new Set();
  parsed.forEach((p) => p.forEach((_, k) => labels.add(k)));
  const differing = [...labels].filter((k) => {
    const vals = parsed.map((p) => p.get(k)?.[1] || '');
    return new Set(vals).size > 1 && vals.every(Boolean);
  }).slice(0, 2);
  const out = new Map();
  articles.forEach((a, i) => {
    const specDiff = differing.map((k) => `${parsed[i].get(k)[0]} ${parsed[i].get(k)[1]}`).join(', ');
    let label = [useSuffix ? (suffixes[i] || 'Standard') : '', specDiff].filter(Boolean).join(', ');
    if (!label) {
      const words = articles.map((x) => new Set(nameLines(x).join(' ').split(' ')));
      const common = [...words[0]].filter((w) => words.every((s) => s.has(w)));
      label = nameLines(a).join(' ').split(' ').filter((w) => !common.includes(w)).join(' ');
    }
    out.set(a.artNr, label || `Art.-Nr. ${a.artNr}`);
  });
  return out;
}

module.exports = {
  nameLines, detectBrand, extractModel, extractCategory, baseCategory, categoryKey, baseModel, modelKey,
  groupKeyFor, singleArticleKey, deviceGroup, mainGroup, MAIN_ORDER, slugify, parseSpecs, detectDrive, detectBatterySystem, variantLabels,
};
