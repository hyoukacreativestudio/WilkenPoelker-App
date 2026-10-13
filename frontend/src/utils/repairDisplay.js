// Display helpers shared by the repair list and detail screens.
// Repairs imported from Taifun use the Taifun order number as repair number and
// carry the order date in `estimatedCompletion` (see backend taifunRepairSync).

// "Auftrags-Nr." for new bikes / leasing, "Reparatur-Nr." for repairs
export function repairNumberLabelKey(repair) {
  return repair?.category === 'neu' || repair?.category === 'leasing'
    ? 'repairs.orderNumberShort'
    : 'repairs.repairNumber';
}

// When the order was placed in the shop (not when the app imported it)
export function repairOrderDate(repair) {
  if (repair?.taifunRepairId && repair?.estimatedCompletion) return repair.estimatedCompletion;
  return repair?.createdAt || repair?.receivedDate || repair?.date;
}

// Only worth showing when it differs from the repair number
export function separateOrderNumber(repair) {
  const nr = repair?.taifunRepairId;
  return nr && String(nr) !== String(repair.repairNumber || repair.number || '') ? nr : null;
}

// Internal import notes ("Aus Taifun importiert …") are not meant for customers
export function visibleHistoryNote(note) {
  return note && !/taifun/i.test(note) ? note : null;
}
