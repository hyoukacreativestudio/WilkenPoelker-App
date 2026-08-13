// Create/refresh the fixed department accounts used by the desktop tool's
// passwordless click-login. Linked by stable username (not by a person's name
// or email). Run once on the server:  node scripts/create-desktop-accounts.js
//
// The password is random (the desktop login never uses it). Existing accounts
// keep their name; only role/active/verified are ensured.

const crypto = require('crypto');
const { sequelize } = require('../src/config/database');
const { User } = require('../src/models');
const { hashPassword } = require('../src/utils/crypto');

const ACCOUNTS = [
  { username: 'admin',        name: 'Admin Management',        role: 'admin' },
  { username: 'fahrrad',      name: 'Fahrrad Management',      role: 'bike_manager' },
  { username: 'reinigung',    name: 'Reinigung Management',    role: 'cleaning_manager' },
  { username: 'service',      name: 'Service Management',      role: 'service_manager' },
  { username: 'rasenmaeher',  name: 'Rasenmäher Management',   role: 'motor_manager' },
  { username: 'robby',        name: 'Robby Management',        role: 'robby_manager' },
  { username: 'motorgeraete', name: 'Motorgeräte Management',  role: 'motor_equipment_manager' },
  { username: 'elektro',      name: 'Elektrofahrzeuge Management', role: 'ev_manager' },
  { username: 'verkauf',      name: 'Verkauf Management',      role: 'sales_manager' },
  { username: 'lieferungen',  name: 'Lieferungen Management',  role: 'delivery_manager' },
  { username: 'bestellungen', name: 'Bestellungen Management', role: 'orders_manager' },
  { username: 'lager',        name: 'Lager Management',        role: 'warehouse_worker' },
];

async function run() {
  await sequelize.authenticate();
  for (const a of ACCOUNTS) {
    const [firstName, ...rest] = a.name.split(' ');
    const lastName = rest.join(' ');
    let user = await User.findOne({ where: { username: a.username } });
    if (user) {
      await user.update({ role: a.role, isActive: true, emailVerified: true });
      console.log(`updated  ${a.username}  (${user.role})`);
    } else {
      const password = await hashPassword(crypto.randomBytes(24).toString('hex'));
      user = await User.create({
        username: a.username,
        email: `${a.username}@intern.wilkenpoelker.de`,
        password,
        role: a.role,
        firstName,
        lastName,
        isActive: true,
        emailVerified: true,
        dsgvoAccepted: true,
        agbAccepted: true,
      });
      console.log(`created  ${a.username}  -> ${a.name} (${a.role})`);
    }
  }
  console.log('\nDone. Department accounts are ready for the desktop click-login.');
  await sequelize.close();
}

run().catch((err) => { console.error('create-desktop-accounts failed:', err.message); process.exit(1); });
