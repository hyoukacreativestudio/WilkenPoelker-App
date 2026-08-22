// Company workforce for the hidden admin tool (Urlaub tab). Mirrors the
// "Über uns → Unser Team" list in the app. The live team content (edited by
// admins) is used when present; otherwise this fallback applies.
//
// Department overrides requested by the boss:
//   • Dominik Przybilski, Daniel Meister, Sven Onken → "Neurad"
//   • Patrick Bonn, Dominik Schmelzer               → "Reparaturannahme"

const DEPARTMENT_OVERRIDES = {
  'Dominik Przybilski': 'Neurad',
  'Daniel Meister': 'Neurad',
  'Sven Onken': 'Neurad',
  'Patrick Bonn': 'Reparaturannahme',
  'Dominik Schmelzer': 'Reparaturannahme',
};

// Fallback roster (name → department) used when the DB has no team content.
const FALLBACK = [
  ['Clemens Poelker Junior', 'Geschäftsführung'],
  ['Andrea Poelker', 'Buchhaltung'],
  ['Eva Müller', 'Buchhaltung'],
  ['Carina Horstmann', 'Buchhaltung'],
  ['Nils Poelker', 'Buchhaltung'],
  ['Dominik Schmelzer', 'Service / Reparatur'],
  ['Martin Horstmann', 'Service / Reparatur'],
  ['Klaus Schulte', 'Service / Reparatur'],
  ['Rita Körte', 'Service / Reparatur'],
  ['Theda Schmidt', 'Service / Reparatur'],
  ['Florian Werner', 'Verkauf E-Bikes'],
  ['Thomas Thoben', 'Verkauf E-Bikes'],
  ['Tim Bieker', 'Verkauf E-Bikes'],
  ['Yannick Möhlmann', 'Verkauf E-Bikes'],
  ['Frederic Malzahn', 'Verkauf E-Bikes'],
  ['Jan Schultka', 'Verkauf Motorgeräte / Kärcher'],
  ['Michael Heikens', 'Verkauf Motorgeräte / Kärcher'],
  ['Patrick Bonn', 'Werkstatt Zweirad'],
  ['Fabian Benker', 'Werkstatt Zweirad'],
  ['Max Breiting', 'Werkstatt Zweirad'],
  ['Mirco Tammen', 'Werkstatt Zweirad'],
  ['Jan Lakeberg', 'Werkstatt Zweirad'],
  ['Manuela Scherzer-Brosch', 'Werkstatt Zweirad'],
  ['Ivan Yusyumbeli', 'Werkstatt Zweirad'],
  ['Sven Onken', 'Werkstatt Zweirad'],
  ['Daniel Meister', 'Werkstatt Zweirad'],
  ['Dominik Przybilski', 'Werkstatt Zweirad'],
  ['Sönke Haskamp', 'Werkstatt Zweirad'],
  ['Hauke Siedentopp', 'Werkstatt Motorgeräte'],
  ['Andreas Rohlmann', 'Werkstatt Motorgeräte'],
  ['Martin Middendorf', 'Werkstatt Motorgeräte'],
  ['Patrick Rotman', 'Werkstatt Motorgeräte'],
  ['Rainer Quappe', 'Mähroboter'],
  ['Marcel Baumann', 'Mähroboter'],
  ['Alexander Kampen', 'Kärcher'],
  ['Thomas Janssen', 'Kärcher'],
  ['Stephan Dykhoff', 'Hausmeister'],
  ['Waldemar Wolf', 'Hausmeister'],
  ['Hauke Heyen', 'Hausmeister'],
].map(([name, department]) => ({ name, department }));

// Flatten the app's team content ({ departments: [{ label, members:[{name}] }] })
// into { name, department } rows; falls back to FALLBACK when empty.
function resolveRoster(teamContent) {
  let rows = [];
  const groups = teamContent && Array.isArray(teamContent.departments) ? teamContent.departments : null;
  if (groups && groups.length) {
    for (const g of groups) {
      const dept = g.label || g.department || 'Sonstige';
      for (const m of (g.members || [])) {
        if (m && m.name) rows.push({ name: String(m.name).trim(), department: dept });
      }
    }
  }
  if (!rows.length) rows = FALLBACK.map((r) => ({ ...r }));

  // Apply the boss's department overrides by name.
  for (const r of rows) {
    if (DEPARTMENT_OVERRIDES[r.name]) r.department = DEPARTMENT_OVERRIDES[r.name];
  }
  rows.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
  return rows;
}

module.exports = { resolveRoster, DEPARTMENT_OVERRIDES, FALLBACK };
