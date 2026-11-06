const { Op } = require('sequelize');
const { User } = require('../models');

// Which of these Taifun customer numbers belong to an app account? The PC tool
// uses it to split its customer lists into "Ohne App" / "Mit App".
async function appCustomerNumbers(numbers) {
  const list = [...new Set((numbers || []).map((n) => String(n || '').trim()).filter(Boolean))];
  if (!list.length) return new Set();
  const users = await User.findAll({ where: { customerNumber: { [Op.in]: list } }, attributes: ['customerNumber'] });
  return new Set(users.map((u) => String(u.customerNumber)));
}

// Adds hasApp to plain rows that carry a customerNumber field.
async function markHasApp(rows, field = 'customerNumber') {
  const set = await appCustomerNumbers(rows.map((r) => r[field]));
  return rows.map((r) => ({ ...r, hasApp: set.has(String(r[field] || '').trim()) }));
}

module.exports = { appCustomerNumbers, markHasApp };
