const { firstNumberFor, isForCustomer, needsCustomerOrderNumber, nameFits } = require('../src/services/customerOrderService');

test('2026 continues at 1101, later years start at 1 again', () => {
  expect(firstNumberFor(2026)).toBe(1101);
  expect(firstNumberFor(2027)).toBe(1);
});

describe('name check for the phone number', () => {
  const known = 'Herr Julia Müller-Schmidt';

  test('surname, first name or both fit, in any order and spelling case', () => {
    expect(nameFits('Müller-Schmidt', known)).toBe(true);
    expect(nameFits('mueller schmidt', known)).toBe(true);
    expect(nameFits('schmidt, julia', known)).toBe(true);
    expect(nameFits('JULIA', known)).toBe(true);
  });

  test('another name or only initials do not fit', () => {
    expect(nameFits('Meyer', known)).toBe(false);
    expect(nameFits('Julia Meyer', known)).toBe(false);
    expect(nameFits('J', known)).toBe(false);
    expect(nameFits('', known)).toBe(false);
    expect(nameFits('Julia', '')).toBe(false);
  });
});

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
