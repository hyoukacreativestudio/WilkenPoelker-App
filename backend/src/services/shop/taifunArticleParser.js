const { XMLParser } = require('fast-xml-parser');
const iconv = require('iconv-lite');
const { decodeXmlBuffer } = require('../taifunSyncService');

// Parses Bruno's Taifun stock exports from the SFTP folder /Bestand:
//  - XML with <ArtList><Art>... one or many articles (two formats seen: with
//    WHG/Nr/Kurztext, and the older one with ListeBrutto)
//  - text file with reservations, CSV lines "{GUID}","ArtNr","1,00" (windows-1252)
// File names may change, so the content decides what a file is (classifyFile).

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: false, // keep tabs/new lines inside the texts
  parseTagValue: false,
  removeNSPrefix: true,
  htmlEntities: true,
  isArray: (name) => ['Art', 'ArtBestand'].includes(name),
});

const str = (v) => {
  if (v === undefined || v === null || typeof v === 'object') return null;
  const s = String(v).replace(/\r\n?/g, '\n').trim();
  return s.length ? s : null;
};
const num = (v) => {
  const s = str(v);
  if (s == null) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const guidOf = (v) => {
  const s = str(v);
  return s ? s.replace(/[{}]/g, '').toUpperCase() : null;
};

function parseArticleXml(buffer) {
  const xml = decodeXmlBuffer(buffer);
  const doc = parser.parse(xml);
  if (!doc || !('ArtList' in doc)) throw new Error('Keine Artikeldatei: <ArtList> fehlt');
  const list = doc.ArtList?.Art || [];
  const out = [];
  for (const a of list) {
    const udf = a.ArtUDF01 && typeof a.ArtUDF01 === 'object' ? a.ArtUDF01 : {};
    const artNr = str(udf.ArtNr) || str(a.Nr);
    if (!artNr) continue;
    const stockRows = a.ArtBestandList?.ArtBestand || [];
    const ist = stockRows.map((b) => num(b.Ist)).filter((n) => n != null);
    out.push({
      guid: guidOf(udf.GUID),
      artNr,
      whg: num(a.WHG),
      text1: str(udf.Text1),
      text2: str(udf.Text2),
      kurztext: str(a.Kurztext) || str(a.Langtext),
      listNet: num(a.Liste),
      listGrossRaw: num(a.ListeBrutto),
      shopPrice: num(a.Ladenpreis),
      stock: ist.length ? ist.reduce((s, n) => s + n, 0) : null,
      datePut: str(a.DatePut) || str(udf.DatePut),
    });
  }
  return out;
}

// Reservations: sum per article number. The GUID column belongs to the
// reservation (it matches no article GUID), so the article number is the key.
function parseReservations(buffer) {
  const text = iconv.decode(buffer, 'win1252');
  const sums = new Map();
  for (const line of text.split(/\r?\n/)) {
    const cols = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1].trim());
    if (cols.length < 3 || !/^\{[0-9a-f-]{20,}\}$/i.test(cols[0])) continue;
    const artNr = cols[1];
    const qty = num(cols[2]);
    if (!artNr || qty == null) continue;
    sums.set(artNr, (sums.get(artNr) || 0) + qty);
  }
  return sums;
}

// 'articles', 'reservations' or null (not one of Bruno's stock files).
function classifyFile(buffer) {
  const start = buffer.slice(0, 300).toString('latin1').replace(/^\u00ef\u00bb\u00bf/, '').trimStart();
  if (start.startsWith('<')) return 'articles';
  return parseReservations(buffer).size > 0 ? 'reservations' : null;
}

// Kaercher is a separate Taifun account with its own files. It re-uses the group
// numbers of the main account (101 is "CCE Hochdruckreiniger" there, "Akku-Geraete"
// here), so its groups are stored with an offset and its articles under their own
// catalog. Recognised by the file name (SHOP_KAERCHER_FILE_PATTERN once the name is
// known) or because most of the file's articles are called Kaercher.
const KAERCHER_WHG_OFFSET = 10000;
const KAERCHER_NAME = /k(\u00e4|ae|a)rcher/i;

function isKaercherFileName(fileName, pattern = process.env.SHOP_KAERCHER_FILE_PATTERN) {
  if (KAERCHER_NAME.test(fileName || '')) return true;
  return !!pattern && new RegExp(pattern, 'i').test(fileName || '');
}

function applyCatalog(list, fileName, pattern) {
  const named = list.filter((a) => KAERCHER_NAME.test(`${a.text1 || ''} ${a.kurztext || ''}`)).length;
  if (!isKaercherFileName(fileName, pattern) && named * 2 <= list.length) {
    return list.map((a) => ({ ...a, catalog: 'main' }));
  }
  return list.map((a) => ({ ...a, catalog: 'kaercher', whg: a.whg == null ? null : a.whg + KAERCHER_WHG_OFFSET }));
}

module.exports = { parseArticleXml, parseReservations, classifyFile, applyCatalog, isKaercherFileName, KAERCHER_WHG_OFFSET };
