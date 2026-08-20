// Remove the seed / test accounts and all their data. This deletes:
//   • test CUSTOMER accounts  (email ending in @test.de)
//   • test STAFF accounts     (any account with a role, e.g. bikemanager,
//                              servicemanager, robbymanager, superadmin …)
//
// It ALWAYS keeps:
//   • admin@wilkenpoelker.de
//   • every @intern.wilkenpoelker.de account  → these are the PC-program
//     department logins (fahrrad, service, robby, bestellungen …). Deleting
//     them would break the desktop click-login, so they are protected.
//
// Run on the server:  node scripts/delete-test-accounts.js
// (Run  node scripts/create-desktop-accounts.js  FIRST so the @intern
//  accounts exist before the seed staff accounts are removed.)

const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');
const models = require('../src/models');
const { User } = models;
const authService = require('../src/services/authService');

// Never delete these, no matter what.
const KEEP_EMAILS = ['admin@wilkenpoelker.de'];
const KEEP_EMAIL_DOMAIN = '@intern.wilkenpoelker.de'; // all PC-program accounts

async function run() {
  await sequelize.authenticate();

  const users = await User.findAll();

  // Decide what to delete: test customers (@test.de) + any staff account,
  // minus the protected ones.
  const targets = users.filter((u) => {
    const email = (u.email || '').toLowerCase();
    if (KEEP_EMAILS.includes(email)) return false;
    if (email.endsWith(KEEP_EMAIL_DOMAIN)) return false;      // PC-program accounts
    const isTestCustomer = email.endsWith('@test.de');
    const isStaff = u.role && u.role !== 'customer';
    return isTestCustomer || isStaff;
  });

  console.log(`Found ${targets.length} account(s) to delete.`);
  console.log(`Keeping: ${KEEP_EMAILS.join(', ')} + all *${KEEP_EMAIL_DOMAIN} + real customers.\n`);

  let ok = 0;
  for (const u of targets) {
    try {
      // Staff can be referenced by other rows (assigned tickets/appointments,
      // repairs as technician, staff ratings). Null those out first so the
      // cascade delete doesn't hit a foreign-key constraint.
      await clearStaffReferences(u.id);
      await authService.deleteUserCascade(u, models);
      console.log(`deleted  ${u.email || u.username} (${u.role})`);
      ok += 1;
    } catch (err) {
      console.log(`skipped  ${u.email || u.username} (${u.role}) — ${err.message}`);
    }
  }

  console.log(`\nDone. Deleted ${ok}/${targets.length}.`);
  await sequelize.close();
}

// Detach a staff user from rows that point at them via a non-userId column.
async function clearStaffReferences(userId) {
  const { Ticket, Appointment, Repair, StaffRating } = models;

  // Unassign (keep the record, just clear the staff link).
  const nullRefs = [
    [Ticket, 'assignedTo'],
    [Appointment, 'assignedTo'],
    [Appointment, 'staffQuestionBy'],
    [Repair, 'technicianId'],
  ];
  for (const [Model, field] of nullRefs) {
    if (!Model) continue;
    try {
      await Model.update({ [field]: null }, { where: { [field]: userId } });
    } catch (e) { /* column may not exist on this model — ignore */ }
  }

  // A rating that points at the deleted staff member is meaningless → remove it.
  if (StaffRating) {
    try { await StaffRating.destroy({ where: { staffId: userId } }); } catch (e) { /* ignore */ }
  }
}

run().catch((err) => { console.error('delete-test-accounts failed:', err.message); process.exit(1); });
