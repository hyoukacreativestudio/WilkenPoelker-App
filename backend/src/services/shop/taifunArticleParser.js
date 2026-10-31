const { XMLParser } = require('fast-xml-parser');
const iconv = require('iconv-lite');
const { decodeXmlBuffer } = require('../taifunSyncService');

// Parses Bruno's Taifun stock exports from the SFTP folder /Bestand:
//  - Art*.xml   <ArtList><Art>... one or many articles (two formats seen:
//                with WHG/Nr/Kurztext, and the older one with ListeBrutto)
//  - art-res*   reservations, CSV lines "GUID","ArtNr","1,00" (windows-1252)

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
  const list = doc?.ArtList?.Art || [];
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
    if (cols.length < 3) continue;
    const artNr = cols[1];
    const qty = num(cols[2]);
    if (!artNr || qty == null) continue;
    sums.set(artNr, (sums.get(artNr) || 0) + qty);
  }
  return sums;
}

module.exports = { parseArticleXml, parseReservations };
