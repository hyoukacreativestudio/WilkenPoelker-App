const { Op } = require('sequelize');
const { XMLParser } = require('fast-xml-parser');
const iconv = require('iconv-lite');
const { sequelize, TaifunCustomer, TaifunOrder } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { resolveByGuid } = require('./taifunStatusMap');

// In-memory status (per-process; resets on restart). Sufficient for the
// "is the sync alive?" check; durable history goes through AuditLog.
const status = {
  lastSyncAt: null,
  lastSyncDurationMs: null,
  lastSyncCounts: { received: 0, inserted: 0, updated: 0, vanished: 0 },
  lastError: null,
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseAttributeValue: false,
  parseTagValue: false,             // keep raw strings (we cast deliberately)
  removeNSPrefix: true,             // strip Taifun namespace prefix
  htmlEntities: true,
});

function asBool(v) {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  return false;
}

function asTrimmedString(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function looksLikeEmail(v) {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function asTime(v) {
  if (!v) return null;
  // Taifun ships "17:41:00" — already Postgres-friendly
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(v) ? v : null;
}

function asDate(v) {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

// Decode XML buffer. Taifun ships windows-1252; if the prologue says so we
// transcode to UTF-8 before parsing (fast-xml-parser is UTF-8 only).
function decodeXmlBuffer(buffer) {
  const head = buffer.slice(0, 200).toString('latin1').toLowerCase();
  const charsetMatch = head.match(/encoding=["']([^"']+)["']/i);
  const encoding = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';

  if (encoding === 'utf-8' || encoding === 'utf8') {
    return buffer.toString('utf8');
  }
  if (encoding === 'windows-1252' || encoding === 'cp1252' || encoding === 'latin1' || encoding === 'iso-8859-1') {
    // Re-emit a UTF-8 declared prologue so fast-xml-parser doesn't choke
    const decoded = iconv.decode(buffer, 'win1252');
    return decoded.replace(/encoding=["'][^"']+["']/i, 'encoding="UTF-8"');
  }
  throw new AppError(`Unsupported XML encoding: ${encoding}`, 400, 'XML_BAD_ENCODING');
}

function mapAhToCustomer(ah) {
  // Prefer GUID when Taifun ships it; otherwise use KdNr as the primary key
  // (Bruno's AU-APP export does not include KdGUID). Skip only if neither is present.
  const guid = asTrimmedString(ah.KdGUID);
  const kdNr = asTrimmedString(ah.KdNr);
  if (!guid && !kdNr) return null;

  // Email field can contain non-email markers like "per Post" — keep them out
  const rawEmail = asTrimmedString(ah.KdEMail);
  const email = looksLikeEmail(rawEmail) ? rawEmail : null;

  return {
    kdGuid: guid || `kdnr:${kdNr}`, // synthetic GUID so upsert has a stable key
    kdNr,
    kdRec: asTrimmedString(ah.KdRec),
    kdMatch: asTrimmedString(ah.KdMatch),
    name1: asTrimmedString(ah.KdName1),
    name2: asTrimmedString(ah.KdName2),
    anrede: asTrimmedString(ah.KdAnrede),
    street: asTrimmedString(ah.KdAnschriftStr),
    houseNumber: asTrimmedString(ah.KdAnschriftHNr),
    zip: asTrimmedString(ah.KdAnschriftPLZ),
    city: asTrimmedString(ah.KdAnschriftOrt),
    countryIso: asTrimmedString(ah.KdCtyISO),
    email,
    phone: asTrimmedString(ah.KdTelefon),
    phoneNorm: asTrimmedString(ah.KdNormTelefon),
    mobile: asTrimmedString(ah.KdFunk),
    mobileNorm: asTrimmedString(ah.KdNormFunk),
    geoLat: ah.KdGeoLat ? Number(ah.KdGeoLat) : null,
    geoLong: ah.KdGeoLong ? Number(ah.KdGeoLong) : null,
    lastSyncedAt: new Date(),
  };
}

function mapAhToOrder(ah) {
  const nr = asTrimmedString(ah.Nr);
  const kdGuid = asTrimmedString(ah.KdGUID) || `kdnr:${asTrimmedString(ah.KdNr) || ''}`;
  if (!nr || kdGuid === 'kdnr:') return null;

  // Resolve the Taifun status GUID to a consolidated app status right here, so
  // the app never has to know Taifun's 47 raw stands.
  const ahStandGuid = asTrimmedString(ah.AhStandGUID);
  const st = resolveByGuid(ahStandGuid);

  return {
    nr,
    date: asDate(ah.Date),
    time: asTime(ah.Time),
    info: asTrimmedString(ah.Info),
    priority: ah.AhPriority != null ? Number(ah.AhPriority) : 0,
    erledigt: asBool(ah.Erledigt),
    storno: asBool(ah.Storno),
    offen: ah.AhOffen === undefined ? true : asBool(ah.AhOffen),
    dspDel: asBool(ah.AhDspDel),
    mobile: asBool(ah.AhMobile),
    technicianState: ah.TechnicianState != null ? Number(ah.TechnicianState) : 0,
    ahStandGuid,
    appStatus: st.appStatus,
    appStatusLabel: st.appStatusLabel,
    appCategory: st.appCategory,
    appHidden: st.hidden,
    kdGuid,
    kdNr: asTrimmedString(ah.KdNr),
    lastSyncedAt: new Date(),
    vanishedAt: null, // re-appeared means it's no longer vanished
  };
}

/**
 * Import a Taifun XML payload.
 *
 * Semantics: FULL EXPORT. Every push is the complete current set of open
 * work orders. Any order present in our DB but NOT in this push is marked
 * `vanishedAt = NOW()` so we can show it as "completed/closed" in the app
 * even if Taifun stopped exporting it.
 *
 * Delta semantics would skip the vanish step; we'd configure that per env
 * if Bruno's exporter ever switches.
 */
async function importXml(buffer, { isFullExport = true, source = 'unknown' } = {}) {
  const t0 = Date.now();
  let counts = { received: 0, inserted: 0, updated: 0, vanished: 0 };

  const xmlText = decodeXmlBuffer(buffer);
  const parsed = xmlParser.parse(xmlText);

  // Defensive: the root is <AhList> with zero, one, or many <Ah> children.
  // fast-xml-parser may collapse a single child to an object instead of array.
  let ahs = parsed?.AhList?.Ah ?? [];
  if (!Array.isArray(ahs)) ahs = [ahs];

  counts.received = ahs.length;

  if (ahs.length === 0) {
    logger.warn('Taifun sync: empty AhList', { source });
    return finishSync(t0, counts, null);
  }

  // Build deduped maps (the XML repeats the customer on every order)
  const customersByGuid = new Map();
  const orders = [];
  for (const ah of ahs) {
    const customer = mapAhToCustomer(ah);
    if (customer) customersByGuid.set(customer.kdGuid, customer);
    const order = mapAhToOrder(ah);
    if (order) orders.push(order);
  }

  const syncedOrderNumbers = orders.map((o) => o.nr);

  await sequelize.transaction(async (t) => {
    // 1) Upsert customers (bulkCreate with updateOnDuplicate works on Postgres+SQLite)
    if (customersByGuid.size > 0) {
      await TaifunCustomer.bulkCreate(Array.from(customersByGuid.values()), {
        transaction: t,
        updateOnDuplicate: [
          'kdNr', 'kdRec', 'kdMatch', 'name1', 'name2', 'anrede',
          'street', 'houseNumber', 'zip', 'city', 'countryIso',
          'email', 'phone', 'phoneNorm', 'mobile', 'mobileNorm',
          'geoLat', 'geoLong', 'lastSyncedAt',
        ],
      });
    }

    // 2) Upsert orders and count insert vs update by checking which already existed
    if (orders.length > 0) {
      const existingNrs = (await TaifunOrder.findAll({
        attributes: ['nr'],
        where: { nr: { [Op.in]: syncedOrderNumbers } },
        transaction: t,
      })).map((o) => o.nr);
      const existingSet = new Set(existingNrs);

      counts.inserted = orders.filter((o) => !existingSet.has(o.nr)).length;
      counts.updated = orders.length - counts.inserted;

      await TaifunOrder.bulkCreate(orders, {
        transaction: t,
        updateOnDuplicate: [
          'date', 'time', 'info', 'priority',
          'erledigt', 'storno', 'offen', 'dspDel', 'mobile',
          'technicianState', 'ahStandGuid',
          'appStatus', 'appStatusLabel', 'appCategory', 'appHidden',
          'kdGuid', 'kdNr',
          'lastSyncedAt', 'vanishedAt',
        ],
      });
    }

    // 3) Full-export: mark any not-in-this-push orders as vanished
    if (isFullExport) {
      const [vanished] = await TaifunOrder.update(
        { vanishedAt: new Date() },
        {
          where: {
            nr: { [Op.notIn]: syncedOrderNumbers.length ? syncedOrderNumbers : [''] },
            vanishedAt: null,
          },
          transaction: t,
        }
      );
      counts.vanished = vanished;
    }
  });

  // Push the freshly-imported orders into app-visible Repair records. Runs
  // after the mirror transaction committed, so a repair-sync hiccup never rolls
  // back the import. Only orders whose customer has an app account become Repairs.
  try {
    const repairSync = require('./taifunRepairSync');
    const r = await repairSync.syncRepairsForOrderNrs(syncedOrderNumbers);
    if (r.created || r.updated) {
      logger.info('Taifun repair sync', { ...r, source });
    }
  } catch (err) {
    logger.error('Taifun repair sync failed', { error: err.message, source });
  }

  logger.info('Taifun sync completed', { counts, source });
  return finishSync(t0, counts, null);
}

function finishSync(t0, counts, error) {
  status.lastSyncAt = new Date();
  status.lastSyncDurationMs = Date.now() - t0;
  status.lastSyncCounts = counts;
  status.lastError = error ? String(error.message || error) : null;
  return {
    durationMs: status.lastSyncDurationMs,
    ...counts,
  };
}

async function getStatus() {
  const [openOrders, customers, vanished] = await Promise.all([
    TaifunOrder.count({ where: { vanishedAt: null, erledigt: false } }),
    TaifunCustomer.count(),
    TaifunOrder.count({ where: { vanishedAt: { [Op.ne]: null } } }),
  ]);
  return {
    lastSyncAt: status.lastSyncAt,
    lastSyncDurationMs: status.lastSyncDurationMs,
    lastSyncCounts: status.lastSyncCounts,
    lastError: status.lastError,
    inventory: {
      customersTotal: customers,
      ordersOpen: openOrders,
      ordersVanished: vanished,
    },
  };
}

module.exports = { importXml, getStatus };
