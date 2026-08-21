// Import the Robby customer list (exported from the old Excel "Robby
// Kundenliste") into the robby_customers table used by the PC program.
//
// Idempotent: every imported row is tagged with createdByHandle = IMPORT_TAG.
// On each run the previously-imported rows are removed and re-inserted, so
// re-running refreshes the import WITHOUT touching customers that staff added
// by hand in the tool.
//
// Run on the server:  node scripts/import-robby-customers.js

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const { RobbyCustomer } = require('../src/models');

const IMPORT_TAG = 'Import Dez24';
const DATA_FILE = path.resolve(__dirname, 'data', 'robby-customers.json');

async function run() {
  await sequelize.authenticate();

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const records = JSON.parse(raw);
  console.log(`Loaded ${records.length} customers from ${DATA_FILE}`);

  // Remove a previous run of THIS import (leaves hand-added customers alone).
  const removed = await RobbyCustomer.destroy({ where: { createdByHandle: IMPORT_TAG } });
  if (removed) console.log(`Removed ${removed} rows from a previous import.`);

  const rows = records.map((r) => ({
    name: r.name,
    device: r.device || null,
    pin: r.pin || null,
    street: r.street || null,
    zip: r.zip || null,
    city: r.city || null,
    phone: r.phone || null,
    purchaseDate: r.purchaseDate || null,
    notes: r.notes || null,
    createdByHandle: IMPORT_TAG,
  }));

  // Insert in batches to keep memory/SQL size reasonable.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await RobbyCustomer.bulkCreate(chunk);
    inserted += chunk.length;
    console.log(`  inserted ${inserted}/${rows.length}`);
  }

  console.log(`\nDone. Imported ${inserted} Robby customers (tag: "${IMPORT_TAG}").`);
  await sequelize.close();
}

run().catch((err) => { console.error('import-robby-customers failed:', err.message); process.exit(1); });
