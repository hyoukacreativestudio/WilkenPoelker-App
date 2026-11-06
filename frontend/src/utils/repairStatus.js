// One place for how a repair status looks in the app (list, detail, timeline).
// Since 2026-11-06 customers only get these statuses from the server:
// Teile bestellt, KVA geschrieben, Reserviert, Abholbereit, Fertig - wird
// geliefert, Fertig zur Probefahrt (+ completed after they confirmed the pickup).
// The older values stay here for staff views and older data.

// Traffic light: red = waiting for something, yellow = almost there, green = done
export const STATUS_COLORS = {
  ordered: '#E53E3E',
  in_repair: '#E53E3E',
  quote_created: '#DD6B20',
  parts_ordered: '#E53E3E',
  repair_done: '#ECC94B',
  ready: '#38A169',
  completed: '#2D8659',
  leasing_in_progress: '#E53E3E',
  sale_in_progress: '#E53E3E',
  reserved: '#ECC94B',
  sale_test_drive: '#ECC94B',
  sale_delivery: '#38A169',
};

// Finished: no "please be patient" note, counts as done in the list
export const DONE_STATUSES = ['ready', 'sale_delivery', 'completed'];

export function repairStatusLabel(t, status, category) {
  if (status === 'ready' && category === 'leasing') return t('repairs.statusLeasingReady', 'Abholbereit');
  const labels = {
    ordered: t('repairs.statusOrdered', 'Bestellt'),
    in_repair: t('repairs.statusInRepair', 'In Arbeit'),
    quote_created: t('repairs.statusQuoteCreated', 'KVA geschrieben – bitte melden Sie sich'),
    parts_ordered: t('repairs.statusPartsOrdered', 'Teile bestellt'),
    repair_done: t('repairs.statusRepairDone', 'Reparatur fertig'),
    ready: t('repairs.statusReady', 'Abholbereit'),
    completed: t('repairs.statusCompleted', 'Abgeschlossen'),
    leasing_in_progress: t('repairs.statusLeasingInProgress', 'Leasing in Bearbeitung'),
    sale_in_progress: t('repairs.statusInProgress', 'In Bearbeitung'),
    reserved: t('repairs.statusReserved', 'Reserviert'),
    sale_test_drive: t('repairs.statusTestDrive', 'Fertig zur Probefahrt'),
    sale_delivery: t('repairs.statusDelivery', 'Fertig – wird geliefert'),
  };
  return labels[status] || status;
}
