// Backfill derived app fields for Taifun orders imported BEFORE the status
// mapping existed, then (re)create Repairs for any that match an app account.
//
// Orders imported by the old code have appStatus = null and are therefore hidden
// in the app, even though they carry a valid AhStandGUID. This recomputes
// appStatus/appStatusLabel/appCategory/appHidden for every order from its GUID,
// so historical orders show up in the staff outreach list too.
//
// Safe + idempotent — only rows whose derived values actually change are written.
//
// Usage (on the server, from backend/):
//   node scripts/backfill-taifun.js          # apply
//   node scripts/backfill-taifun.js --dry     # preview counts only

const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');
const { TaifunOrder } = require('../src/models');
const { resolveByGuid } = require('../src/services/taifunStatusMap');
const repairSync = require('../src/services/taifunRepairSync');

async function run() {
  const dry = process.argv.includes('--dry');
  await sequelize.authenticate();

  const orders = await TaifunOrder.findAll();
  console.log(`Scanning ${orders.length} Taifun orders...`);

  let changed = 0;
  let nowVisible = 0;
  for (const o of orders) {
    const st = resolveByGuid(o.ahStandGuid);
    const diff =
      o.appStatus !== st.appStatus ||
      o.appStatusLabel !== st.appStatusLabel ||
      o.appCategory !== st.appCategory ||
      o.appHidden !== st.hidden;
    if (!diff) continue;
    changed++;
    if (o.appHidden === true && st.hidden === false) nowVisible++;
    if (!dry) {
      o.appStatus = st.appStatus;
      o.appStatusLabel = st.appStatusLabel;
      o.appCategory = st.appCategory;
      o.appHidden = st.hidden;
      await o.save();
    }
  }

  console.log(`${dry ? '[dry] would update' : 'Updated'} ${changed} orders (${nowVisible} newly visible).`);

  const visibleTotal = await TaifunOrder.count({ where: { appHidden: false, vanishedAt: null } });
  console.log(`Visible orders now: ${visibleTotal}`);

  if (!dry) {
    // (Re)create Repairs for any visible order whose customer has an app account.
    const visible = await TaifunOrder.findAll({
      where: { appHidden: false, vanishedAt: null, storno: false },
    });
    const r = await repairSync.syncOrders(visible);
    console.log(`Repair sync: created ${r.created}, updated ${r.updated}, skipped-no-account ${r.skippedNoUser}`);
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error('backfill-taifun failed:', err.message);
  process.exit(1);
});
