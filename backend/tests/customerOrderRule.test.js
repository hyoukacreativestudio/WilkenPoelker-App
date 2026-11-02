const { isForCustomer, needsCustomerOrderNumber } = require('../src/services/customerOrderService');

describe('Kundenbestellungen rule', () => {
  const base = { customerNumber: '42146', customerName: 'Max Muster', quantity: 2, quantityForStock: 0 };

  test('customer number and not entirely for stock -> customer order', () => {
    expect(needsCustomerOrderNumber(base)).toBe(true);
    expect(needsCustomerOrderNumber({ ...base, quantityForStock: 1 })).toBe(true);
  });

  test('entirely for stock -> no customer order', () => {
    expect(isForCustomer({ ...base, quantityForStock: 2 })).toBe(false);
    expect(needsCustomerOrderNumber({ ...base, quantityForStock: 2 })).toBe(false);
    expect(needsCustomerOrderNumber({ ...base, quantity: '1', quantityForStock: '1' })).toBe(false);
  });

  test('a name without customer number is not enough', () => {
    expect(needsCustomerOrderNumber({ ...base, customerNumber: null })).toBe(false);
    expect(needsCustomerOrderNumber({ ...base, customerNumber: '  ' })).toBe(false);
  });

  test('Rep-/VK-Nr. or an existing number -> no new number', () => {
    expect(needsCustomerOrderNumber({ ...base, repairNumber: 'R-1' })).toBe(false);
    expect(needsCustomerOrderNumber({ ...base, saleNumber: 'V-1' })).toBe(false);
    expect(needsCustomerOrderNumber({ ...base, refNumber: '77' })).toBe(false);
    expect(needsCustomerOrderNumber({ ...base, customerOrderNumber: 3 })).toBe(false);
  });
});
