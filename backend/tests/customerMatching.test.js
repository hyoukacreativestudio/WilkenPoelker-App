const {
  normStreet, splitStreet, normHouse, nameWords, matchByAddress, matchByEmail, hasHouseNumber,
} = require('../src/utils/customerMatching');

// Fictional Taifun records (name1 = salutation, name2 = name, like Taifun exports them)
const TAIFUN = [
  { kdNr: '90001', name1: 'Herr', name2: 'Paul Prüfmann', street: 'Hauptstraße', houseNumber: '12a', zip: '26842', email: 'Paul.Pruefmann@example.com' },
  { kdNr: '90002', name1: 'Frau', name2: 'Prüfmann', street: 'Hauptstraße', houseNumber: '12a', zip: '26842' },
  { kdNr: '90003', name1: 'Herr', name2: 'Otto Ohnemail', street: 'Kirchweg', houseNumber: '5', zip: '26842' },
  { kdNr: '90004', name1: 'Frau', name2: 'Greta Gleichname', street: 'Moorweg', houseNumber: '3', zip: '26842' },
  { kdNr: '90005', name1: 'Frau', name2: 'Greta Gleichname', street: 'Moorweg', houseNumber: '7', zip: '26842' },
  { kdNr: '90006', name1: 'Herr', name2: 'Hans-Peter Müller-Lüdenscheidt', street: 'Kölner Straße', houseNumber: '3-5', zip: '26842' },
  { kdNr: '90007', name1: 'Familie', name2: 'Familie Weber', street: 'Am Markt', houseNumber: '1', zip: '26842', email: 'weber@example.com' },
  { kdNr: '90008', name1: 'Herr', name2: 'Karl Weber', street: 'Am Markt', houseNumber: '9', zip: '26842', email: 'weber@example.com' },
];
const addr = (street) => ({ street, zip: '26842', city: 'Ostrhauderfehn' });
const match = (firstName, lastName, street) => matchByAddress(TAIFUN, { firstName, lastName, address: addr(street) }).match;

describe('customer matching - normalisation', () => {
  it('treats street spellings alike', () => {
    const forms = ['Kölner Straße', 'Koelner Str.', 'Koelner Strasse', 'kölner str', 'Kölner-Straße'];
    forms.forEach((f) => expect(normStreet(f)).toBe(normStreet('Kölner Straße')));
    expect(normStreet('Hauptstraße')).not.toBe(normStreet('Hauptweg'));
  });

  it('splits street and house number', () => {
    expect(splitStreet('Hauptstr. 12a')).toEqual({ street: 'Hauptstr.', houseNumber: '12a' });
    expect(splitStreet('Hauptstraße 12 a')).toEqual({ street: 'Hauptstraße', houseNumber: '12 a' });
    expect(splitStreet('Am Markt 3-5').houseNumber).toBe('3-5');
    expect(splitStreet('Moorweg')).toEqual({ street: 'Moorweg', houseNumber: '' });
  });

  it('normalises house numbers', () => {
    expect(normHouse('12 a')).toBe('12a');
    expect(normHouse('12A')).toBe('12a');
    expect(normHouse('3-5')).toBe('3');
    expect(normHouse('')).toBe('');
  });

  it('extracts name words without salutations', () => {
    expect(nameWords('Herr Hans-Peter Müller')).toEqual(['hans', 'peter', 'mueller']);
    expect(nameWords('Familie Weber')).toEqual(['weber']);
  });

  it('knows whether a house number was typed', () => {
    expect(hasHouseNumber('Moorweg 7')).toBe(true);
    expect(hasHouseNumber('Moorweg')).toBe(false);
  });
});

describe('customer matching - by name and address', () => {
  it('matches the way customers type their address', () => {
    expect(match('Paul', 'Prüfmann', 'Hauptstraße 12a')).toBe('90001');
    expect(match('Paul', 'Pruefmann', 'Hauptstrasse 12 a')).toBe('90001');
    expect(match('paul', 'PRÜFMANN', 'Hauptstr.12a')).toBe('90001');
    expect(match('Otto', 'Ohnemail', 'Kirchweg 5')).toBe('90003');
  });

  it('handles double names and house-number ranges', () => {
    expect(match('Hans Peter', 'Mueller-Luedenscheidt', 'Koelner Str. 3')).toBe('90006');
    expect(match('Hans-Peter', 'Müller-Lüdenscheidt', 'Kölner Straße 3-5')).toBe('90006');
  });

  it('tells household members and namesakes apart', () => {
    expect(match('Petra', 'Prüfmann', 'Hauptstraße 12a')).toBe('90002'); // record without first name
    expect(match('Greta', 'Gleichname', 'Moorweg 7')).toBe('90005');
    expect(match('Greta', 'Gleichname', 'Moorweg 3')).toBe('90004');
    expect(match('Anna', 'Weber', 'Am Markt 1')).toBe('90007'); // "Familie Weber"
  });

  it('never links on name + postcode alone', () => {
    expect(match('Otto', 'Ohnemail', 'Falschweg 1')).toBeNull(); // wrong street
    expect(match('Otto', 'Ohnemail', 'Kirchweg')).toBeNull(); // no house number
    expect(match('Otto', 'Ohnemail', 'Kirchweg 9')).toBeNull(); // wrong house number
    expect(match('Karl', 'Ohnemail', 'Kirchweg 5')).toBeNull(); // other first name
    expect(match('Greta', 'Gleichname', 'Moorweg')).toBeNull(); // ambiguous
    expect(match('Otto', 'Ohne', 'Kirchweg 5')).toBeNull(); // only part of the last name
  });
});

describe('customer matching - by e-mail', () => {
  it('matches a unique e-mail regardless of case', () => {
    expect(matchByEmail(TAIFUN, 'PAUL.PRUEFMANN@example.com')).toBe('90001');
  });
  it('does not match an e-mail shared by several customer numbers', () => {
    expect(matchByEmail(TAIFUN, 'weber@example.com')).toBeNull();
  });
  it('ignores missing e-mails', () => {
    expect(matchByEmail(TAIFUN, '')).toBeNull();
  });
});
