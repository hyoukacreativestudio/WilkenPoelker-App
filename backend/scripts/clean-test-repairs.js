// One-off cleanup: remove the seeded test repairs so the Repairs tab starts
// empty and fills only from real Taifun data.
//
// Test repairs are the ones created by the seed script — they carry a
// taifunRepairId like "TAI-80001". Real Taifun-synced repairs use the numeric
// Taifun order number as taifunRepairId, and app-created repairs have none, so
// matching on "TAI-%" targets only the seed test data.
//
// Usage (on the server, from backend/):  node scripts/clean-test-repairs.js
//        dry run (no delete, just count):  node scripts/clean-test-repairs.js --dry

const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');
const { Repair, ServiceRating } = require('../src/models');

async function run() {
  const dry = process.argv.includes('--dry');
  await sequelize.authenticate();

  const where = { taifunRepairId: { [Op.like]: 'TAI-%' } };
  const doomed = await Repair.findAll({ where, attributes: ['id', 'repairNumber', 'taifunRepairId'] });

  if (doomed.length === 0) {
    console.log('No test repairs found (taifunRepairId LIKE "TAI-%"). Nothing to do.');
    await sequelize.close();
    return;
  }

  console.log(`Found ${doomed.length} test repair(s):`);
  for (const r of doomed) console.log(`  - ${r.repairNumber} (${r.taifunRepairId})`);

  if (dry) {
    console.log('\n--dry: no changes made.');
    await sequelize.close();
    return;
  }

  const ids = doomed.map((r) => r.id);

  // Remove any ratings that referenced these repairs first (avoid orphans).
  const deletedRatings = await ServiceRating.destroy({ where: { repairId: { [Op.in]: ids } } });
  const deletedRepairs = await Repair.destroy({ where: { id: { [Op.in]: ids } } });

  console.log(`\nDeleted ${deletedRepairs} test repair(s) and ${deletedRatings} related rating(s).`);
  await sequelize.close();
}

run().catch((err) => {
  console.error('clean-test-repairs failed:', err.message);
  process.exit(1);
});
