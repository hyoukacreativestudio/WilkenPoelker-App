// Mock react-native before importing helpers
jest.mock('react-native', () => ({
  Share: { share: jest.fn() },
  Platform: { OS: 'android', select: jest.fn((obj) => obj.android) },
  Linking: { openURL: jest.fn() },
}));

import {
  getInitials,
  groupByDate,
  generateId,
  debounce,
  isAdmin,
  isManager,
  canPost,
} from '../helpers';

describe('getInitials', () => {
  it('returns initials from full name', () => {
    expect(getInitials('Clemens Poelker')).toBe('CP');
  });

  it('returns single initial for single name', () => {
    expect(getInitials('Clemens')).toBe('C');
  });

  it('limits to 2 characters', () => {
    expect(getInitials('Hans Peter Müller')).toBe('HP');
  });

  it('returns ? for empty/null name', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });

  it('uppercases initials', () => {
    expect(getInitials('max mustermann')).toBe('MM');
  });
});

describe('groupByDate', () => {
  it('groups items into today, yesterday, thisWeek, older', () => {
    const now = new Date();
    const items = [
      { id: 1, createdAt: now.toISOString() },
      { id: 2, createdAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() },
      { id: 3, createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 4, createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const groups = groupByDate(items);
    expect(groups.today).toHaveLength(1);
    expect(groups.yesterday).toHaveLength(1);
    expect(groups.thisWeek).toHaveLength(1);
    expect(groups.older).toHaveLength(1);
  });

  it('uses custom date key', () => {
    const now = new Date();
    const items = [{ id: 1, date: now.toISOString() }];
    const groups = groupByDate(items, 'date');
    expect(groups.today).toHaveLength(1);
  });

  it('handles empty array', () => {
    const groups = groupByDate([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(100);
    debounced(); // reset
    jest.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to debounced function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('isAdmin', () => {
  it('returns true for admin', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
  });

  it('returns true for super_admin', () => {
    expect(isAdmin({ role: 'super_admin' })).toBe(true);
  });

  it('returns false for regular users', () => {
    expect(isAdmin({ role: 'customer' })).toBe(false);
    expect(isAdmin({ role: 'bike_manager' })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('isManager', () => {
  it('returns true for all manager roles', () => {
    expect(isManager({ role: 'admin' })).toBe(true);
    expect(isManager({ role: 'super_admin' })).toBe(true);
    expect(isManager({ role: 'bike_manager' })).toBe(true);
    expect(isManager({ role: 'cleaning_manager' })).toBe(true);
    expect(isManager({ role: 'motor_manager' })).toBe(true);
    expect(isManager({ role: 'service_manager' })).toBe(true);
  });

  it('returns false for customer', () => {
    expect(isManager({ role: 'customer' })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isManager(null)).toBe(false);
    expect(isManager(undefined)).toBe(false);
  });
});

describe('canPost', () => {
  it('returns true for managers', () => {
    expect(canPost({ role: 'admin' })).toBe(true);
    expect(canPost({ role: 'bike_manager' })).toBe(true);
  });

  it('returns false for customers', () => {
    expect(canPost({ role: 'customer' })).toBe(false);
  });
});
