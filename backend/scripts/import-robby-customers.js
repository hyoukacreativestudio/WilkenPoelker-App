// Import the Robby customer list (exported from the old Excel "Robby
// Kundenliste") into the robby_customers table used by the PC program.
//
// Idempotent: every imported row is tagged with createdByHandle = IMPORT_TAG.
// On each run the previously-imported rows are removed and re-inserted, so
// re-running refreshes the import WITHOUT touching customers that staff added
// by hand in the tool.
//
// Safe: the delete + insert run inside ONE transaction, so if anything fails
// nothing is lost (the old data stays). The `pin` column is ensured up front in
// case the API hasn't been restarted yet.
//
// Run on the server:  node scripts/import-robby-customers.js

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const { RobbyCustomer } = require('../src/models');

const IMPORT_TAG = 'Import Dez24';
const DATA_FILE = path.resolve(__dirname, 'data', 'robby-customers.json');

async function ensureColumns() {
  // The list needs the `pin` column; add it if a restart hasn't yet.
  const qi = sequelize.getQueryInterface();
  try {
    const cols = await qi.describeTable('robby_customers');
    if (!cols.pin) {
      await qi.addColumn('robby_customers', 'pin', { type: sequelize.Sequelize.STRING, allowNull: true });
      console.log('Added missing column robby_customers.pin');
    }
  } catch (e) { /* table may not exist yet — sync will create it */ }
}

async function run() {
  await sequelize.authenticate();
  await RobbyCustomer.sync();      // make sure the table exists
  await ensureColumns();

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const records = JSON.parse(raw);
  const withNumber = records.filter((r) => r.customerNumber).length;
  console.log(`Loaded ${records.length} customers from the list (${withNumber} have a customer number, the rest never had one).`);

  const rows = records.map((r) => ({
    name: r.name,
    customerNumber: r.customerNumber || null,
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

  // Delete the previous import + insert the new one atomically. If the insert
  // throws, the delete rolls back — the list is never left empty.
  await sequelize.transaction(async (t) => {
    const removed = await RobbyCustomer.destroy({ where: { createdByHandle: IMPORT_TAG }, transaction: t });
    if (removed) console.log(`Replacing ${removed} rows from a previous import.`);
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      await RobbyCustomer.bulkCreate(rows.slice(i, i + BATCH), { transaction: t });
      console.log(`  inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
  });

  const total = await RobbyCustomer.count();
  const inDb = await RobbyCustomer.count({ where: { createdByHandle: IMPORT_TAG } });
  console.log(`\nDone. ${inDb} imported (tag "${IMPORT_TAG}"), ${total} Robby customers in total.`);
  console.log(`Of the imported ones, ${withNumber} have a Kd-Nr — the others simply had none in the old list.`);
  await sequelize.close();
}

run().catch((err) => { console.error('import-robby-customers failed:', err.message); process.exit(1); });
