// Departments = one company account each. At login you pick a department; that
// selects the account (role). The convention below maps a department to its
// login email (editable on the login screen) and its role/color.
export const DEPARTMENTS = [
  { key: 'admin',        label: 'Admin',            role: 'admin',            color: '#2E7D32', email: 'admin@wilkenpoelker.de' },
  { key: 'fahrrad',      label: 'Fahrrad',          role: 'bike_manager',     color: '#3182CE', email: 'fahrrad@wilkenpoelker.de' },
  { key: 'reinigung',    label: 'Reinigungsgeräte', role: 'cleaning_manager', color: '#00B5D8', email: 'reinigung@wilkenpoelker.de' },
  { key: 'service',      label: 'Service',          role: 'service_manager',  color: '#DD6B20', email: 'service@wilkenpoelker.de' },
  { key: 'rasenmaeher',  label: 'Rasenmäher',       role: 'motor_manager',    color: '#48752b', email: 'rasenmaeher@wilkenpoelker.de' },
  { key: 'robby',        label: 'Robby',            role: 'robby_manager',    color: '#805AD5', email: 'robby@wilkenpoelker.de' },
  { key: 'verkauf',      label: 'Verkauf',          role: 'sales_manager',    color: '#D69E2E', email: 'verkauf@wilkenpoelker.de' },
  { key: 'bestellungen', label: 'Bestellungen',     role: 'orders_manager',   color: '#E53E3E', email: 'bestellungen@wilkenpoelker.de' },
  { key: 'lager',        label: 'Lager',            role: 'warehouse_worker', color: '#718096', email: 'lager@wilkenpoelker.de' },
];

export const ROLE_INFO = Object.fromEntries(DEPARTMENTS.map((d) => [d.role, d]));
export const departmentForRole = (role) => ROLE_INFO[role]?.key || null;
export const labelForRole = (role) => ROLE_INFO[role]?.label || role;
export const colorForRole = (role) => ROLE_INFO[role]?.color || '#2E7D32';

const SEE_ALL = ['admin', 'super_admin'];

// Which modules a role sees in the sidebar.
export function modulesForRole(role) {
  const all = SEE_ALL.includes(role);
  return [
    { key: 'termine',      label: 'Termine',      show: true },
    { key: 'reparaturen',  label: 'Reparaturen',  show: all || role === 'service_manager' },
    { key: 'tickets',      label: 'Tickets',      show: true },
    { key: 'bestellungen', label: 'Bestellungen', show: true },
    { key: 'lager',        label: 'Lager',        show: all || role === 'sales_manager' || role === 'warehouse_worker' || role === 'orders_manager' },
  ].filter((m) => m.show);
}

// Department options for order folders (managers can switch; others fixed)
export const ORDER_DEPARTMENTS = DEPARTMENTS
  .filter((d) => !['bestellungen', 'lager'].includes(d.key))
  .map((d) => ({ key: d.key, label: d.label, color: d.color }));
