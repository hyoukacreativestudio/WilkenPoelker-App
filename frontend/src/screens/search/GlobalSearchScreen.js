import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import { shopApi, shopImageUrl } from '../../api/shop';
import { formatPrice } from '../../utils/formatters';
import { offerOnDark } from '../../theme/colors';
import SearchBar from '../../components/ui/SearchBar';

const plain = (s) => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const PRODUCTS = 12;
const MAIN_ICONS = {
  'Sägen & Holz': 'saw-blade',
  'Rasen & Wiese': 'grass',
  'Hecke & Garten': 'flower-outline',
  'Laub, Kehren & Winter': 'leaf',
  Reinigen: 'water-outline',
  'Bau & Werkstatt': 'hammer-wrench',
  Fahrräder: 'bike',
  Zubehör: 'puzzle-outline',
};

// Areas of the app. "more" screens sit on top of the menu, so "back" lands there.
const AREAS = [
  { key: 'feed', icon: 'home-outline', title: 'navigation.feed', words: 'startseite neuigkeiten beitraege feed oeffnungszeiten', tab: 'Feed', screen: 'FeedHome' },
  { key: 'shop', icon: 'storefront-outline', title: 'shop.title', words: 'produkte sortiment angebote rabatte', tab: 'Shop', screen: 'ShopList' },
  { key: 'repairs', icon: 'wrench-outline', title: 'repairs.title', words: 'reparatur werkstatt abholbereit auftrag', tab: 'Repairs', screen: 'RepairsList' },
  { key: 'appointments', icon: 'calendar-clock', title: 'appointments.title', words: 'termin buchen', tab: 'Appointments', screen: 'AppointmentsList' },
  { key: 'notifications', icon: 'bell-outline', title: 'more.notifications', words: 'nachrichten mitteilungen', tab: 'More', screen: 'Notifications', sub: true },
  { key: 'profile', icon: 'account-outline', title: 'more.profile', words: 'konto kundennummer adresse daten', tab: 'More', screen: 'Profile', sub: true },
  { key: 'settings', icon: 'cog-outline', title: 'more.settings', words: 'einstellungen dunkel hell sprache schrift', tab: 'More', screen: 'Settings', sub: true },
  { key: 'about', icon: 'information-outline', title: 'more.aboutUs', words: 'kontakt adresse telefon oeffnungszeiten team', tab: 'More', screen: 'AboutUs', sub: true },
  { key: 'feedback', icon: 'message-text-outline', title: 'feedback.title', words: 'rueckmeldung vorschlag', tab: 'More', screen: 'Feedback', sub: true },
  { key: 'impressum', icon: 'file-document-outline', title: 'more.impressum', words: 'rechtliches', tab: 'More', screen: 'Impressum', sub: true },
  { key: 'datenschutz', icon: 'shield-lock-outline', title: 'more.datenschutz', words: 'rechtliches dsgvo', tab: 'More', screen: 'Datenschutz', sub: true },
  { key: 'agb', icon: 'file-document-outline', title: 'more.agb', words: 'rechtliches bedingungen', tab: 'More', screen: 'AGB', sub: true },
  { key: 'widerruf', icon: 'file-undo-outline', title: 'more.widerrufsrecht', words: 'rechtliches', tab: 'More', screen: 'Widerrufsrecht', sub: true },
];

export default function GlobalSearchScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const linkColor = isDark ? offerOnDark : theme.colors.primary;
  const [text, setText] = useState('');
  const query = useDebounce(text.trim(), 300);
  const [data, setData] = useState(null);
  const [mains, setMains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  // Without a search term: what is there to look at
  useEffect(() => {
    let alive = true;
    shopApi.getProducts({ limit: 1 })
      .then((res) => { if (alive) setMains(res.data?.data?.facets?.main || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (query.length < 2) { setData(null); setLoading(false); setFailed(false); return; }
    const id = ++requestId.current;
    setLoading(true);
    shopApi.getProducts({ q: query, limit: PRODUCTS })
      .then((res) => { if (id === requestId.current) { setData(res.data?.data || null); setFailed(false); } })
      .catch(() => { if (id === requestId.current) setFailed(true); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, [query]);

  const areas = useMemo(() => {
    const words = plain(query).split(/\s+/).filter(Boolean);
    if (query.length < 2) return [];
    return AREAS.filter((a) => {
      const hay = `${plain(t(a.title))} ${a.words}`;
      return words.every((w) => hay.includes(w));
    });
  }, [query, t]);

  const openShop = (params) => navigation.navigate('Main', {
    screen: 'Shop',
    params: { screen: 'ShopList', pop: true, params: { ...params, nonce: Date.now() } },
  });
  const openProduct = (p) => navigation.navigate('Main', {
    screen: 'Shop',
    params: { screen: 'ShopDetail', initial: false, params: { slug: p.slug, title: p.title } },
  });
  const openArea = (a) => navigation.navigate('Main', {
    screen: a.tab,
    params: a.sub ? { screen: a.screen, initial: false } : { screen: a.screen, pop: true },
  });

  const heading = (label) => (
    <Text style={[theme.typography.styles.caption, styles.heading, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }]}>
      {label}
    </Text>
  );

  const row = ({ key, icon, title, count, onPress }) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: theme.colors.divider }]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={22} color={theme.colors.textSecondary} />
      <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1, marginLeft: theme.spacing.md }]} numberOfLines={1}>{title}</Text>
      {count != null ? <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary, marginRight: theme.spacing.xs }]}>{count}</Text> : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  const items = data?.items || [];
  const categories = (data?.facets?.category || []).slice(0, 3);
  const searching = query.length >= 2;
  const nothing = searching && !loading && !failed && data && !items.length && !areas.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <View style={[styles.bar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={theme.hitSlop} accessibilityRole="button" accessibilityLabel={t('common.back')} style={{ marginRight: theme.spacing.sm }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <SearchBar value={text} onChangeText={setText} onClear={() => setText('')} placeholder={t('search.placeholder')} autoFocus style={{ flex: 1 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
        {!searching ? (
          <>
            {mains.length ? heading(t('search.categories')) : null}
            {mains.map((m) => row({
              key: m.value, icon: MAIN_ICONS[m.value] || 'shape-outline', title: m.label, count: m.count, onPress: () => openShop({ main: m.value }),
            }))}
            {heading(t('search.areas'))}
            {AREAS.filter((a) => !a.sub).map((a) => row({ key: a.key, icon: a.icon, title: t(a.title), onPress: () => openArea(a) }))}
          </>
        ) : null}

        {searching && categories.length ? heading(t('search.inCategory')) : null}
        {searching ? categories.map((c) => row({
          key: c.value, icon: MAIN_ICONS[c.main] || 'shape-outline', title: c.label, count: c.count, onPress: () => openShop({ search: query, main: c.main, category: c.value }),
        })) : null}

        {searching && items.length ? heading(t('search.products')) : null}
        {searching ? items.map((p) => (
          <TouchableOpacity
            key={p.slug}
            onPress={() => openProduct(p)}
            activeOpacity={0.7}
            style={[styles.product, { borderBottomColor: theme.colors.divider }]}
            accessibilityRole="button"
            accessibilityLabel={p.title}
          >
            <View style={[styles.thumb, { borderRadius: theme.borderRadius.md }]}>
              {p.image ? (
                <Image source={{ uri: shopImageUrl(p.image) }} style={styles.thumbImage} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="image-off-outline" size={22} color="#9E9E9E" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>{p.title}</Text>
              <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                {p.price != null ? `${p.variantCount > 1 ? `${t('shop.from')} ` : ''}${formatPrice(p.price)}` : t('shop.priceOnRequest')}
                {' · '}
                {p.available ? t('shop.available') : t('shop.notAvailable')}
              </Text>
            </View>
          </TouchableOpacity>
        )) : null}
        {searching && data && data.total > items.length ? (
          <TouchableOpacity onPress={() => openShop({ search: query })} style={[styles.all, { borderColor: linkColor, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.md }]} accessibilityRole="button">
            <Text style={{ color: linkColor, fontWeight: '600' }}>{t('search.allProducts', { count: data.total })}</Text>
          </TouchableOpacity>
        ) : null}

        {searching && areas.length ? heading(t('search.areas')) : null}
        {searching ? areas.map((a) => row({ key: a.key, icon: a.icon, title: t(a.title), onPress: () => openArea(a) })) : null}

        {loading && !items.length ? <ActivityIndicator style={{ marginTop: theme.spacing.xl }} color={theme.colors.primary} /> : null}
        {failed ? <Text style={[theme.typography.styles.body, styles.message, { color: theme.colors.textSecondary }]}>{t('shop.loadError')}</Text> : null}
        {nothing ? <Text style={[theme.typography.styles.body, styles.message, { color: theme.colors.textSecondary }]}>{t('search.nothing', { term: query })}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  heading: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth },
  product: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 56, height: 56, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '90%', height: '90%' },
  all: { height: 46, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  message: { textAlign: 'center', marginTop: 32 },
});
