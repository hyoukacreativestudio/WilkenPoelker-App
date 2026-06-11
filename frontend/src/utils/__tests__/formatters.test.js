import {
  formatPrice,
  formatDate,
  parseDateSafe,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatPercentage,
  truncateText,
  formatFileSize,
  getTimeAgo,
} from '../formatters';

describe('formatPrice', () => {
  it('formats EUR prices in German locale', () => {
    const result = formatPrice(29.99);
    expect(result).toContain('29,99');
    expect(result).toContain('€');
  });

  it('formats zero', () => {
    const result = formatPrice(0);
    expect(result).toContain('0,00');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
  });
});

describe('parseDateSafe', () => {
  it('parses DATEONLY format "YYYY-MM-DD" as local date', () => {
    const d = parseDateSafe('2026-02-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it('passes through Date objects', () => {
    const original = new Date(2026, 0, 1);
    expect(parseDateSafe(original)).toBe(original);
  });

  it('parses ISO strings', () => {
    const d = parseDateSafe('2026-02-15T10:30:00Z');
    expect(d instanceof Date).toBe(true);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('handles timestamps', () => {
    const ts = Date.now();
    const d = parseDateSafe(ts);
    expect(d instanceof Date).toBe(true);
  });
});

describe('formatDate', () => {
  it('formats a date in German locale', () => {
    const result = formatDate('2026-02-15');
    expect(result).toMatch(/15\.02\.2026/);
  });

  it('returns empty for falsy input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatTime', () => {
  it('returns pre-formatted time strings as-is', () => {
    expect(formatTime('14:30')).toBe('14:30');
    expect(formatTime('9:00')).toBe('9:00');
  });

  it('returns empty for falsy input', () => {
    expect(formatTime(null)).toBe('');
    expect(formatTime('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('combines date and time', () => {
    const result = formatDateTime('2026-02-15T10:30:00');
    expect(result).toContain('15.02.2026');
  });

  it('returns empty for falsy input', () => {
    expect(formatDateTime(null)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  it('returns "gerade eben" for very recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('gerade eben');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo)).toBe('vor 5 Min.');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe('vor 3 Std.');
  });

  it('returns "gestern" for yesterday', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(formatRelativeTime(yesterday)).toBe('gestern');
  });

  it('returns days ago for this week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('vor 3 Tagen');
  });

  it('returns empty for falsy input', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('')).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats with German locale (dot separator)', () => {
    const result = formatNumber(1234567);
    expect(result).toMatch(/1\.234\.567/);
  });

  it('returns empty for null/undefined', () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
  });
});

describe('formatPercentage', () => {
  it('formats percentages', () => {
    expect(formatPercentage(75)).toBe('75%');
    expect(formatPercentage(99.7)).toBe('100%');
    expect(formatPercentage(0)).toBe('0%');
  });

  it('returns empty for null/undefined', () => {
    expect(formatPercentage(null)).toBe('');
    expect(formatPercentage(undefined)).toBe('');
  });
});

describe('truncateText', () => {
  it('does not truncate short text', () => {
    expect(truncateText('Hello', 100)).toBe('Hello');
  });

  it('truncates long text with ellipsis', () => {
    const long = 'a'.repeat(200);
    const result = truncateText(long, 100);
    expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
    expect(result).toMatch(/\.\.\.$/);
  });

  it('handles null/empty', () => {
    expect(truncateText(null)).toBeNull();
    expect(truncateText('')).toBe('');
  });

  it('uses default max length of 100', () => {
    const text = 'a'.repeat(101);
    const result = truncateText(text);
    expect(result).toMatch(/\.\.\.$/);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(10485760)).toBe('10 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('getTimeAgo', () => {
  it('returns "gerade eben" without translation function', () => {
    const now = new Date();
    expect(getTimeAgo(now)).toBe('gerade eben');
  });

  it('uses translation function when provided', () => {
    const t = jest.fn((key) => key);
    const now = new Date();
    getTimeAgo(now, t);
    expect(t).toHaveBeenCalledWith('common.justNow');
  });

  it('returns empty for falsy input', () => {
    expect(getTimeAgo(null)).toBe('');
    expect(getTimeAgo('')).toBe('');
  });
});
