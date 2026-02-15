export function formatPrice(price, locale = 'de-DE') {
  if (price == null) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export function formatDate(date, locale = 'de-DE', options = {}) {
  if (!date) return '';
  const d = parseDateSafe(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Safely parse date strings - handles both DATEONLY ("2026-02-15")
 * and full ISO datetime ("2026-02-15T10:00:00Z") strings.
 * DATEONLY strings are parsed as local midnight to avoid timezone issues.
 */
export function parseDateSafe(date) {
  if (date instanceof Date) return date;
  if (typeof date !== 'string') return new Date(date);
  // DATEONLY format: "2026-02-15" (exactly 10 chars, no T)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day); // Local midnight, not UTC
  }
  return new Date(date);
}

export function formatTime(date, locale = 'de-DE') {
  if (!date) return '';
  // Handle time-only strings like "10:00" or "14:30"
  if (typeof date === 'string' && /^\d{1,2}:\d{2}$/.test(date)) {
    return date; // Already formatted as HH:mm
  }
  const d = parseDateSafe(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date, locale = 'de-DE') {
  if (!date) return '';
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

export function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = parseDateSafe(date);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHour < 24) return `vor ${diffHour} Std.`;
  if (diffDay === 1) return 'gestern';
  if (diffDay < 7) return `vor ${diffDay} Tagen`;
  if (diffWeek < 4) return `vor ${diffWeek} Wochen`;
  return formatDate(date);
}

export function formatNumber(num, locale = 'de-DE') {
  if (num == null) return '';
  return new Intl.NumberFormat(locale).format(num);
}

export function formatPercentage(value) {
  if (value == null) return '';
  return `${Math.round(value)}%`;
}

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getTimeAgo(date, t) {
  if (!date) return '';
  const now = new Date();
  const d = parseDateSafe(date);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return t ? t('common.justNow') : 'gerade eben';
  if (diffMin < 60) return t ? t('common.minutesAgo', { count: diffMin }) : `vor ${diffMin} Min.`;
  if (diffHour < 24) return t ? t('common.hoursAgo', { count: diffHour }) : `vor ${diffHour} Std.`;
  if (diffDay === 1) return t ? t('common.yesterday') : 'gestern';
  if (diffDay < 7) return t ? t('common.daysAgo', { count: diffDay }) : `vor ${diffDay} Tagen`;
  return formatDate(date);
}
