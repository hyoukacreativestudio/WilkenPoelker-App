// Pure matching rules for linking an app account to its Taifun customer number.
// Taifun always has name + address (e-mail/phone are often missing), so the address
// comparison has to tolerate the ways customers type them. No database access here,
// so the rules can be unit-tested (tests/customerMatching.test.js).

// Customers type umlauts either way ("Müller" / "Mueller", "Kölner" / "Koelner").
const foldUmlauts = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

// Normalize a street for fuzzy comparison: umlauts folded, "straße/strasse/str."
// unified to "str", everything non-alphanumeric dropped.
// So "Dresdener Str." == "Dresdener Straße" and "Koelner Strasse" == "Kölner Str.".
function normStreet(s) {
  return foldUmlauts(s)
    .replace(/strasse|strase|str\.?/g, 'str')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\d+[a-z]?$/, ''); // drop a trailing house number if it slipped into the street
}

// "Musterstraße 12a" -> { street: "Musterstraße", houseNumber: "12a" }
function splitStreet(s) {
  const raw = String(s || '').trim();
  const m = raw.match(/^(.*?)[\s,]*(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/);
  return m ? { street: m[1], houseNumber: m[2] } : { street: raw, houseNumber: '' };
}

// "12 a" == "12a"; a range "12-14" is compared by its first number
function normHouse(h) {
  const m = foldUmlauts(h).replace(/\s+/g, '').match(/^(\d+)([a-z])?/);
  return m ? m[1] + (m[2] || '') : '';
}

// Name words without salutations/fillers: "Herr Hans-Peter Müller" -> [hans, peter, mueller]
const NAME_FILLERS = new Set(['herr', 'frau', 'familie', 'fam', 'eheleute', 'und', 'u', 'firma', 'fa', 'dr', 'prof']);
function nameWords(s) {
  return foldUmlauts(s).replace(/[^a-z]+/g, ' ').trim().split(' ')
    .filter((w) => w && !NAME_FILLERS.has(w));
}

function normEmail(email) {
  const lower = String(email || '').trim().toLowerCase();
  if (!lower.includes('@')) return '';
  try { return require('validator').normalizeEmail(lower) || lower; } catch { return lower; }
}

// Unique customer number among Taifun records sharing the user's e-mail, else null
function matchByEmail(records, email) {
  const mail = normEmail(email);
  if (!mail) return null;
  const nrs = [...new Set(records.filter((r) => normEmail(r.email) === mail).map((r) => r.kdNr).filter(Boolean))];
  return nrs.length === 1 ? nrs[0] : null;
}

// Unique customer number among the Taifun records of the user's postcode:
// last name + street, plus the first name when Taifun has one and the house number
// when Taifun has one. Name + postcode alone never links an account.
function matchByAddress(candidates, { firstName, lastName, address }) {
  if (!lastName || !address?.street) return { match: null, matches: 0 };
  const lastWords = nameWords(lastName);
  const first = nameWords(firstName)[0] || '';
  const parts = splitStreet(address.street);
  const street = normStreet(parts.street);
  const house = normHouse(parts.houseNumber);
  if (!lastWords.length || !street) return { match: null, matches: 0 };

  const matches = candidates.filter((c) => {
    // every word of the last name ("Müller-Lüdenscheidt" -> 2 words) is in the Taifun name
    const taifunWords = new Set(nameWords(`${c.name1 || ''} ${c.name2 || ''}`));
    if (!lastWords.every((w) => taifunWords.has(w))) return false;
    if (normStreet(splitStreet(c.street).street) !== street) return false;
    // Taifun name with a first name ("Martin Blache") must contain the user's first name
    const personWords = nameWords(c.name2);
    if (first && personWords.length > 1 && !personWords.includes(first)) return false;
    // Taifun house number known -> the user's must be the same
    const taifunHouse = normHouse(c.houseNumber || splitStreet(c.street).houseNumber);
    if (taifunHouse && taifunHouse !== house) return false;
    return true;
  });
  // A household can have a record with the first name and one without
  // ("Paul Prüfmann" / "Prüfmann"): the one naming this person wins.
  const named = first ? matches.filter((c) => nameWords(c.name2).includes(first)) : [];
  const pool = named.length ? named : matches;
  const nrs = [...new Set(pool.map((c) => c.kdNr).filter(Boolean))];
  return { match: nrs.length === 1 ? nrs[0] : null, matches: matches.length };
}

// The street field must contain a house number for an automatic match
const hasHouseNumber = (street) => !!normHouse(splitStreet(street).houseNumber);

module.exports = {
  foldUmlauts, normStreet, splitStreet, normHouse, nameWords, normEmail,
  matchByEmail, matchByAddress, hasHouseNumber,
};
