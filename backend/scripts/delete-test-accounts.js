// Delete the seed TEST customer accounts (email ending in @test.de) and all
// their data. Keeps admin@wilkenpoelker.de and every department/staff account.
// Run on the server:  node scripts/delete-test-accounts.js
//
// Add extra emails to DELETE_EMAILS below if you want to remove specific ones.

const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');
const models = require('../src/models');
const { User } = models;
const authService = require('../src/services/authService');

const KEEP_EMAILS = ['admin@wilkenpoelker.de'];
const DELETE_EMAILS = []; // optional: specific extra emails to delete

async function run() {
  await sequelize.authenticate();

  const users = await User.findAll({
    where: {
      [Op.and]: [
        { email: { [Op.notIn]: KEEP_EMAILS } },
        {
          [Op.or]: [
            { email: { [Op.like]: '%@test.de' } },
            DELETE_EMAILS.length ? { email: { [Op.in]: DELETE_EMAILS } } : null,
          ].filter(Boolean),
        },
      ],
    },
  });

  console.log(`Found ${users.length} test account(s) to delete.`);
  let ok = 0;
  for (const u of users) {
    try {
      // adminDeleteUser refuses staff roles, so only real customers get removed.
      await authService.adminDeleteUser(u.id, models);
      console.log(`deleted  ${u.email} (${u.role})`);
      ok += 1;
    } catch (err) {
      console.log(`skipped  ${u.email} (${u.role}) — ${err.message}`);
    }
  }
  console.log(`\nDone. Deleted ${ok}/${users.length}. Kept: ${KEEP_EMAILS.join(', ')} + all staff/department accounts.`);
  await sequelize.close();
}

run().catch((err) => { console.error('delete-test-accounts failed:', err.message); process.exit(1); });
