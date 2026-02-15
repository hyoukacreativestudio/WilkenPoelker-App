import { Share, Platform, Linking } from 'react-native';
import { parseDateSafe } from './formatters';

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export async function shareContent({ title, message, url }) {
  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message: `${message} ${url}`, url }
        : { message: `${message} ${url}`, title }
    );
  } catch {}
}

export function openMaps(lat, lng, label = 'WilkenPoelker') {
  const scheme = Platform.select({
    ios: `maps:0,0?q=${label}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${label})`,
  });
  Linking.openURL(scheme);
}

export function openPhone(number) {
  Linking.openURL(`tel:${number}`);
}

export function openEmail(email, subject = '') {
  Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
}

export function openUrl(url) {
  Linking.openURL(url);
}

export function groupByDate(items, dateKey = 'createdAt') {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const weekAgo = new Date(today - 604800000);

  items.forEach((item) => {
    const date = parseDateSafe(item[dateKey]);
    const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let group;
    if (itemDay >= today) group = 'today';
    else if (itemDay >= yesterday) group = 'yesterday';
    else if (itemDay >= weekAgo) group = 'thisWeek';
    else group = 'older';

    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  return groups;
}

export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce(func, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

export function isAdmin(user) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export function isManager(user) {
  return ['admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager'].includes(user?.role);
}

export function canPost(user) {
  return isManager(user);
}
