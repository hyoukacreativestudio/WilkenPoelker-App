// Taifun "Stand" (Status) lookup + consolidation into app-facing statuses.
//
// Every Taifun work order carries an <AhStandGUID> that points to one entry in
// Bruno's KonsAhStandList (shipped once as AU-Stand3.xml). That entry has a
// numeric code (Nr) and a German label (Txt). There are 47 of them — far too
// granular to show customers. Per Kai we collapse them into a handful of
// app statuses across three categories: reparatur, leasing, neu.
//
// IMPORTANT: matching is by GUID, not by Nr. Taifun can re-number a Stand, but
// the GUID is stable. Nr is kept only for documentation / a human-readable
// fallback. Orders whose AhStandGUID is empty or unknown resolve to `unknown`
// (hidden) — they have no status set on the Taifun side yet.

// App status codes (stable keys the frontend switches on) + German labels.
// category groups them for the app's Neu / Reparatur / Leasing views.
// repairStatus is the value written to Repair.status (the app's repair model).
// Note: every "pickup-ready" end state maps to 'ready' regardless of category,
// so the existing pickup-acknowledge + 7-day-cleanup flow works for all three.
const APP_STATUS = {
  REP_BESTELLT:          { category: 'reparatur', label: 'Bestellt',                repairStatus: 'ordered' },
  REP_IN_ARBEIT:         { category: 'reparatur', label: 'Reparatur in Arbeit',     repairStatus: 'in_repair' },
  REP_KVA:               { category: 'reparatur', label: 'KVA erstellt',            repairStatus: 'quote_created' },
  REP_TEILE_BESTELLT:    { category: 'reparatur', label: 'Teile bestellt',          repairStatus: 'parts_ordered' },
  REP_ABHOLBEREIT:       { category: 'reparatur', label: 'Reparatur Abholbereit',   repairStatus: 'ready' },
  LEASING_IN_ARBEIT:     { category: 'leasing',   label: 'Leasing in Bearbeitung',  repairStatus: 'leasing_in_progress' },
  LEASING_ABGESCHLOSSEN: { category: 'leasing',   label: 'Leasing abgeschlossen',   repairStatus: 'ready' },
  NEU_IN_ARBEIT:         { category: 'neu',       label: 'In Bearbeitung',          repairStatus: 'sale_in_progress' },
  NEU_PROBEFAHRT:        { category: 'neu',       label: 'Zur Probefahrt',          repairStatus: 'sale_test_drive' },
  NEU_ABHOLBEREIT:       { category: 'neu',       label: 'Abholbereit',             repairStatus: 'ready' },
};

// All repair-status enum values used by Taifun-synced repairs (superset of the
// app's original repair statuses). Kept here so the model + migration stay in sync.
const REPAIR_STATUSES = [
  'ordered', 'in_repair', 'quote_created', 'parts_ordered', 'repair_done', 'ready', 'completed',
  'leasing_in_progress',
  'sale_in_progress', 'sale_test_drive',
];

// Raw Taifun stands -> app status code (null = hidden, not shown in the app).
// [guid, nr, taifunText, appStatusCode|null]
// Source: AU-Stand3.xml (KonsAhStandList). Consolidation decided with Kai.
const STANDS = [
  // --- 1xx Reparatur / Ersatzteile ---
  ['{9ED98E57-70EC-4C12-8CBE-239C998D739A}', 100, 'Reparatur in Arbeit',            'REP_IN_ARBEIT'],
  ['{12C71866-1302-48BA-8E57-653EF5BCA471}', 101, 'Reparatur fertig',               'REP_ABHOLBEREIT'],
  ['{C736C4BE-A749-4C9E-91CD-BB9B3BA96DF5}', 102, 'ET zur Bestellung Werkstatt',    'REP_TEILE_BESTELLT'],
  ['{4B9685DA-D928-4809-A38C-A5662AB89163}', 103, 'ET Bestellung eingegeben',       'REP_TEILE_BESTELLT'],
  ['{7B287184-EC38-431F-9000-3C624300FE8D}', 104, 'Reparatur KVA erstellt',         'REP_KVA'],
  ['{7596A7BB-AFA0-44C9-8CF3-75DA4D7248B8}', 105, 'Reparatur Rücksprache m. Kd ha', 'REP_IN_ARBEIT'],
  ['{A9DAF5F3-812D-42D3-B0AB-204A724D5190}', 106, 'vor Ort Reparatur',              'REP_IN_ARBEIT'],
  ['{B355A0F2-26BD-404C-996A-9EB00D3C178D}', 107, 'Reparatur GA Voranfrage',        'REP_IN_ARBEIT'],
  ['{4A5610AE-4152-4846-9277-77A468740E90}', 108, 'Reparatur GA eingeschickt',      'REP_IN_ARBEIT'],
  ['{D91E8156-7D32-46F3-8CA2-A6DC7D8FB34D}', 109, 'Reparatur Leasing Anfrage',      'LEASING_IN_ARBEIT'],
  ['{A88791E0-8FAF-465C-A73C-C15B89BFCDB1}', 110, 'Reparatur entsorgen',            null],
  ['{43F34BFA-19CA-45D2-8263-8612D461A0B0}', 111, 'Reparatur unrepariert zurück',   'REP_ABHOLBEREIT'],
  ['{3FE6EA34-DEA0-4C13-AD45-33E06B76BBAE}', 112, 'Reparatur m Hersteller klären',  'REP_IN_ARBEIT'],
  ['{102FFF20-C305-498F-871F-00C1F8E0303B}', 113, 'Reparatur reparie n. Absp.kd',   'REP_IN_ARBEIT'],
  ['{3E726839-5912-4C2D-B0AB-3933CBBA57F7}', 114, 'Reparatur fertig AK',            'REP_ABHOLBEREIT'],
  ['{59576AFE-8563-4DC4-A5C8-E91B698B87BF}', 115, 'Reparatur fertig TJ',            'REP_ABHOLBEREIT'],
  ['{ACF2D39B-369F-4442-8AA3-239C99CA1FA8}', 116, 'ET sind da bereit zur Rep.',     'REP_IN_ARBEIT'],
  ['{D887502D-E682-48CA-AB77-F4022F6B26E6}', 117, 'Reparatur fertig Abholbereit',   'REP_ABHOLBEREIT'],

  // --- 2xx RY (vor Ort / Recycling) -> in Reparatur einsortiert ---
  ['{40E715BC-4BDF-4A2F-A902-5735D0CB068E}', 200, 'RY vort Ort Reparatur',          'REP_IN_ARBEIT'],
  ['{6D6109BA-477E-41C2-805C-B65CB2BC5A92}', 201, 'RY Gerät bestellt',              'REP_BESTELLT'],
  ['{2FBEB2D7-981B-4EE6-9CF5-6F99CDA273A0}', 202, 'RY Termin Aufb',                 'REP_IN_ARBEIT'],
  ['{A176C02A-082C-4B98-9431-CD09CE9BCA72}', 203, 'RY Kd meldet sich we. Aufb',     'REP_IN_ARBEIT'],
  ['{A758A637-953D-4F41-A0E5-2BA3D3948D03}', 204, 'RY Termin Bes.',                 'REP_IN_ARBEIT'],
  ['{71139FE8-28BA-43B9-8852-02522F30DC59}', 205, 'RY Termin Rep. vor Ort',         'REP_IN_ARBEIT'],
  ['{B6EDBB7D-7502-45EC-AAA0-5012B5CD7047}', 206, 'RY Gerät entsorgt Neugerät',     'REP_BESTELLT'],
  ['{F84B8F31-8400-4C0B-BFAF-02DD14EA1882}', 207, 'RY Gerät entsorgt kein Neug',    'REP_ABHOLBEREIT'],

  // --- 3xx Leasing (2 App-Status: in Bearbeitung / abgeschlossen[+abholbereit]) ---
  ['{16150235-155D-441F-BB15-63BEE9854A5D}', 300, 'Leasing in Bearbeitung',         'LEASING_IN_ARBEIT'],
  ['{07A73580-43F8-4484-B820-5DE305ADB4BB}', 301, 'Leasing Zubehör',                'LEASING_IN_ARBEIT'],
  ['{90B3D4DF-B6D1-4855-B3AD-3751A875A922}', 302, 'Leasing abgeschlossen',          'LEASING_ABGESCHLOSSEN'],
  ['{6923995F-0CF3-475B-ACAF-D94A1C218BFA}', 303, 'Leasing freigegeben',            'LEASING_ABGESCHLOSSEN'],
  ['{F7BCF409-376B-41B3-90DC-91C651ABF7D7}', 304, 'Leasing freige. + Abholbereit',  'LEASING_ABGESCHLOSSEN'],
  ['{04B10134-493C-4AE2-A133-2514E21F179D}', 305, 'Leasing auf Termin eingeben',    'LEASING_IN_ARBEIT'],

  // --- 4xx Neu / Verkauf (3 App-Status: in Bearbeitung / Probefahrt / abholbereit) ---
  ['{3A0350CC-65D1-4312-B369-FC51DEEF222E}', 403, 'Neu fertig - wird geliefert',    'NEU_ABHOLBEREIT'],
  ['{89262E3F-EDBD-4EE6-9E5B-152F9B7807BA}', 404, 'Neu fertig-abhol Bereit',        'NEU_ABHOLBEREIT'],
  ['{1B0ED507-0CAC-4AC1-9E53-5D7B32C4CD5D}', 405, 'Unmontiert zur Probefahrt',      'NEU_IN_ARBEIT'],
  ['{490B38DB-836A-46F7-9C3C-31CDC0B0761D}', 406, 'Neu fertig-zur Probefahrt',      'NEU_PROBEFAHRT'],
  ['{BA4A7837-EEB2-4A09-B28E-8035AAC3F119}', 407, 'Neu reserviert',                 'NEU_IN_ARBEIT'],
  ['{A8CA5268-E141-4C68-ABB1-0AD5664605C8}', 408, 'Neu bestellt',                   'NEU_IN_ARBEIT'],
  ['{7A777657-4E94-4B4D-8382-E2DC7EB26F9C}', 409, 'Neu in Bearbeitung abholen',     'NEU_IN_ARBEIT'],
  ['{06E754AE-6878-49E2-96DC-72A54497E207}', 410, 'Neu in Bearbeitung liefern',     'NEU_IN_ARBEIT'],
  ['{516A7A16-FBAD-4919-87A1-14BDEE4AEE38}', 411, 'muss bestellt werden',           'NEU_IN_ARBEIT'],

  // --- 5xx Sonstige -> komplett ausgeblendet ---
  ['{053E00B4-E64F-4CE9-8A49-A84667E61FB3}', 500, 'Kunde abgesagt weil?',           null],
  ['{4A904C98-1E3E-4FC2-91CB-3C73CC916B7A}', 501, 'im KA zu verkaufen',             null],
  ['{222C95AA-8B48-4969-BA40-165881618246}', 502, 'Direktlieferung',                null],
  ['{930FD362-7D0C-4125-8644-4A83438708AD}', 503, 'Inzahlungnahme',                 null],
  ['{951B9DB0-FE9E-4374-81EA-A481921EDBD2}', 504, 'cp fragen',                      null],
  ['{E48CB04E-EF58-4648-A03C-879FBCD25D02}', 505, 'Test123',                        null],
];

// Normalize a GUID for lookup: strip braces + whitespace, uppercase.
function normGuid(guid) {
  if (!guid) return null;
  return String(guid).trim().replace(/[{}]/g, '').toUpperCase();
}

function buildEntry(guid, nr, text, code) {
  const meta = code ? APP_STATUS[code] : null;
  return {
    guid,
    nr,
    taifunText: text,
    appStatus: code,                 // null = hidden
    appStatusLabel: meta ? meta.label : null,
    appCategory: meta ? meta.category : null,
    repairStatus: meta ? meta.repairStatus : null,
    hidden: code === null,
    unknown: false,
  };
}

// Map an app status code -> { category, repairStatus, label } for building a
// Repair record. Returns null for hidden/unknown codes.
function appStatusToRepair(code) {
  const meta = code ? APP_STATUS[code] : null;
  if (!meta) return null;
  return { category: meta.category, repairStatus: meta.repairStatus, label: meta.label };
}

const byGuid = new Map();
const byNr = new Map();
for (const [guid, nr, text, code] of STANDS) {
  const entry = buildEntry(guid, nr, text, code);
  byGuid.set(normGuid(guid), entry);
  byNr.set(nr, entry);
}

// Fallback for orders with an empty or unrecognized AhStandGUID.
function unknownEntry(guid) {
  return {
    guid: guid || null,
    nr: null,
    taifunText: null,
    appStatus: null,
    appStatusLabel: null,
    appCategory: null,
    hidden: true,
    unknown: true,
  };
}

// Resolve a Taifun AhStandGUID to an app status. Never throws.
function resolveByGuid(guid) {
  const key = normGuid(guid);
  if (!key) return unknownEntry(guid);
  return byGuid.get(key) || unknownEntry(guid);
}

function resolveByNr(nr) {
  return byNr.get(Number(nr)) || null;
}

module.exports = {
  APP_STATUS,
  REPAIR_STATUSES,
  STANDS,
  normGuid,
  resolveByGuid,
  resolveByNr,
  appStatusToRepair,
};
