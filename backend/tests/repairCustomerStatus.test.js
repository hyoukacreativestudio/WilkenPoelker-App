const M = require('../src/services/taifunStatusMap');

// User decision 2026-11-06: customers only see Teile bestellt, KVA geschrieben,
// Reserviert, Abholbereit, Fertig - wird geliefert, Fertig zur Probefahrt.
describe('repair statuses shown to customers', () => {
  const byNr = (nr) => M.resolveByNr(nr);

  test('the six customer statuses come from the right Taifun stands', () => {
    expect(byNr(102).repairStatus).toBe('parts_ordered');
    expect(byNr(103).repairStatus).toBe('parts_ordered');
    expect(byNr(104).repairStatus).toBe('quote_created');
    expect(byNr(407).repairStatus).toBe('reserved');
    expect(byNr(101).repairStatus).toBe('ready');
    expect(byNr(404).repairStatus).toBe('ready');
    expect(byNr(304).repairStatus).toBe('ready');
    expect(byNr(403).repairStatus).toBe('sale_delivery');
    expect(byNr(406).repairStatus).toBe('sale_test_drive');
    [102, 104, 407, 101, 404, 403, 406, 304].forEach((nr) => expect(M.isCustomerStatus(byNr(nr).repairStatus)).toBe(true));
  });

  test('work in progress stays in the PC tool but not in the app', () => {
    [100, 105, 107, 116, 200, 201, 300, 302, 303, 405, 408, 409].forEach((nr) => {
      const e = byNr(nr);
      expect(e.hidden).toBe(false); // still listed for staff
      expect(M.isCustomerStatus(e.repairStatus)).toBe(false);
    });
  });

  test('every finished code offers the WhatsApp "fertig" message', () => {
    expect(M.READY_CODES).toEqual(expect.arrayContaining(['REP_ABHOLBEREIT', 'NEU_ABHOLBEREIT', 'NEU_GELIEFERT', 'LEASING_ABHOLBEREIT']));
    M.READY_CODES.forEach((code) => expect(M.APP_STATUS[code]).toBeTruthy());
    expect(M.REPAIR_STATUSES).toEqual(expect.arrayContaining(['reserved', 'sale_delivery']));
  });
});
