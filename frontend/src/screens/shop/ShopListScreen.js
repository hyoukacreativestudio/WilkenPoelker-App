import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, Modal, TouchableOpacity, Image, StyleSheet, ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useScreenEdges } from '../../hooks/useScreenEdges';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import { shopApi, shopImageUrl } from '../../api/shop';
import { formatPrice } from '../../utils/formatters';
import { offerOnDark } from '../../theme/colors';
import SearchBar from '../../components/ui/SearchBar';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';
import ShopFilterSheet, { emptyShopFilters, countShopFilters, priceLabel, chooseMain, chooseDevice } from './ShopFilterSheet';

const PAGE = 40;
const SORTS = ['relevance', 'price_asc', 'price_desc', 'name'];

export default function ShopListScreen({ navigation, route }) {
  const safeEdges = useScreenEdges();
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const offerColor = isDark ? offerOnDark : theme.colors.primary;
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : 2;
  const gap = theme.spacing.sm;
  const cardWidth = (width - theme.spacing.md * 2 - gap * (columns - 1)) / columns;

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 350);
  const [filters, setFilters] = useState(emptyShopFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const params = useMemo(() => ({
    q: debounced || undefined,
    main: filters.main || undefined,
    category: filters.category || undefined,
    brand: filters.brand.join(',') || undefined,
    drive: filters.drive.join(',') || undefined,
    system: filters.system.join(',') || undefined,
    size: filters.size.join(',') || undefined,
    color: filters.color.join(',') || undefined,
    available: filters.available ? '1' : undefined,
    offer: filters.offer ? '1' : undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    sort: filters.sort !== 'relevance' ? filters.sort : undefined,
    limit: PAGE,
  }), [debounced, filters]);

  const load = useCallback(async ({ nextPage = 1, mode = 'initial' } = {}) => {
    const id = ++requestId.current;
    if (mode === 'more') setLoadingMore(true); else if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    try {
      const res = await shopApi.getProducts({ ...params, page: nextPage });
      if (id !== requestId.current) return;
      const d = res.data?.data || {};
      setItems((prev) => (nextPage === 1 ? d.items || [] : [...prev, ...(d.items || [])]));
      setFacets(d.facets || null);
      setTotal(d.total || 0);
      setPage(nextPage);
      setError(false);
    } catch (e) {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  // "Alle ansehen" on the home screen opens the list with only the discounts
  const offersParam = route?.params?.offers;
  useEffect(() => {
    if (offersParam) setFilters({ ...emptyShopFilters, offer: true });
  }, [offersParam]);

  // The app-wide search hands over a term and/or a category
  const nonce = route?.params?.nonce;
  useEffect(() => {
    if (!nonce) return;
    setFilters({ ...emptyShopFilters, main: route.params.main || '', category: route.params.category || '' });
    setSearch(route.params.search || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const activeCount = countShopFilters(filters);

  // What is switched on right now, each with a tap to remove it
  const activeTags = useMemo(() => {
    const options = (key) => (key === 'size' ? facets?.size?.options : facets?.[key]);
    const labelOf = (key, v) => options(key)?.find((o) => o.value === v)?.label || String(v);
    const tags = [];
    ['drive', 'system', 'size', 'color', 'brand'].forEach((key) => {
      filters[key].forEach((v) => tags.push({
        id: `${key}-${v}`,
        label: labelOf(key, v),
        remove: (f) => ({ ...f, [key]: f[key].filter((x) => x !== v) }),
      }));
    });
    if (filters.minPrice || filters.maxPrice) {
      tags.push({ id: 'price', label: priceLabel(t, filters.minPrice, filters.maxPrice), remove: (f) => ({ ...f, minPrice: '', maxPrice: '' }) });
    }
    return tags;
  }, [filters, facets, t]);
  const loadMore = () => {
    if (!loading && !loadingMore && items.length < total) load({ nextPage: page + 1, mode: 'more' });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ShopDetail', { slug: item.slug, title: item.title })}
      style={[styles.card, { width: cardWidth, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg }]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.imageBox, { borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg }]}>
        {item.image ? (
          <Image source={{ uri: shopImageUrl(item.image) }} style={styles.image} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="image-off-outline" size={36} color="#9E9E9E" />
        )}
        {item.isOffer ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.badgeText}>
              {item.discountPercent > 0
                ? `${item.discountUpTo ? `${t('shop.upTo')} ` : ''}${t('shop.discount', { percent: item.discountPercent })}`
                : t('shop.offer')}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: theme.spacing.sm, flex: 1 }}>
        {item.brand ? <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]} numberOfLines={1}>{item.brand}</Text> : null}
        <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={3}>{item.title}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ marginTop: theme.spacing.xs }}>
          {item.price != null ? (
            <Text style={[theme.typography.styles.h6, { color: item.isOffer ? offerColor : theme.colors.text }]}>
              {item.variantCount > 1 ? `${t('shop.from')} ` : ''}{formatPrice(item.price)}
            </Text>
          ) : (
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary }]}>{t('shop.priceOnRequest')}</Text>
          )}
          {item.isOffer && item.uvp ? (
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, textDecorationLine: 'line-through' }]}>
              {t('shop.uvp')} {formatPrice(item.uvp)}
            </Text>
          ) : null}
          <View style={styles.availRow}>
            <View style={[styles.dot, { backgroundColor: item.available ? theme.colors.success : theme.colors.textTertiary }]} />
            <Text style={[theme.typography.styles.caption, { color: item.available ? theme.colors.success : theme.colors.textTertiary }]}>
              {item.available ? t('shop.available') : t('shop.notAvailable')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // First level right above the list: main categories, then the devices inside one
  // Largest group first, the chosen one always in view
  const devices = useMemo(() => [...(facets?.category || [])]
    .sort((a, b) => (b.value === filters.category) - (a.value === filters.category) || b.count - a.count), [facets, filters.category]);
  const categoryBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, gap: theme.spacing.xs, alignItems: 'center' }}
    >
      {filters.main ? (
        <>
          <TouchableOpacity
            onPress={() => setFilters((f) => chooseMain(f, ''))}
            style={[styles.crumb, { borderColor: theme.colors.border, borderRadius: theme.borderRadius.round }]}
            accessibilityRole="button"
            accessibilityLabel={t('shop.allCategories')}
          >
            <MaterialCommunityIcons name="chevron-left" size={18} color={theme.colors.text} />
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{filters.main}</Text>
          </TouchableOpacity>
          {devices.length > 1 || filters.category ? devices.map((d) => (
            <Chip
              key={d.value}
              size="small"
              label={d.label}
              selected={filters.category === d.value}
              onPress={() => setFilters((f) => chooseDevice(f, f.category === d.value ? '' : d.value))}
            />
          )) : null}
        </>
      ) : (facets?.main || []).map((m) => (
        <Chip key={m.value} size="small" label={m.label} onPress={() => setFilters((f) => chooseMain(f, m.value))} />
      ))}
    </ScrollView>
  );

  const quickChips = (
    <View style={[styles.chips, { paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs }]}>
      <Chip
        label={activeCount ? `${t('shop.filters')} (${activeCount})` : t('shop.filters')}
        icon={<MaterialCommunityIcons name="tune-variant" size={14} color={activeCount > 0 ? '#FFFFFF' : (isDark ? theme.colors.text : theme.colors.primary)} />}
        selected={activeCount > 0}
        onPress={() => setSheetOpen(true)}
        size="small"
      />
      <Chip label={t('shop.onlyAvailable')} selected={filters.available} onPress={() => setFilters((f) => ({ ...f, available: !f.available }))} size="small" />
      <Chip label={t('shop.onlyOffers')} selected={filters.offer} onPress={() => setFilters((f) => ({ ...f, offer: !f.offer }))} size="small" />
    </View>
  );

  return (
    <SafeAreaView edges={safeEdges} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} onClear={() => setSearch('')} placeholder={t('shop.searchPlaceholder')} />
      </View>
      {categoryBar}
      {quickChips}
      {activeTags.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: theme.spacing.xs, alignItems: 'center' }}
        >
          {activeTags.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              onPress={() => setFilters(tag.remove)}
              style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : theme.colors.primaryLight, borderRadius: theme.borderRadius.round }]}
              accessibilityRole="button"
              accessibilityLabel={t('shop.removeFilter', { name: tag.label })}
            >
              <Text style={[theme.typography.styles.bodySmall, { color: isDark ? theme.colors.text : theme.colors.primary, fontWeight: '600' }]} numberOfLines={1}>{tag.label}</Text>
              <MaterialCommunityIcons name="close" size={15} color={isDark ? theme.colors.text : theme.colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
          {activeTags.length > 1 ? (
            <TouchableOpacity onPress={() => setFilters((f) => ({ ...emptyShopFilters, main: f.main, category: f.category, sort: f.sort, available: f.available, offer: f.offer }))} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, textDecorationLine: 'underline' }]}>{t('shop.resetFilters')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
      {loading && !items.length ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : error && !items.length ? (
        <EmptyState icon="wifi-off" title={t('shop.loadError')} actionLabel={t('common.retry')} onAction={() => load()} />
      ) : (
        <FlatList
          data={items}
          key={columns}
          numColumns={columns}
          keyExtractor={(i) => i.slug}
          renderItem={renderItem}
          columnWrapperStyle={{ gap }}
          contentContainerStyle={{ padding: theme.spacing.md, paddingTop: theme.spacing.xs, gap }}
          ListHeaderComponent={(
            <View style={[styles.listHead, { marginBottom: theme.spacing.xs }]}>
              <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>
                {t('shop.resultCount', { count: total })}
              </Text>
              <TouchableOpacity onPress={() => setSortOpen(true)} style={styles.sortButton} hitSlop={theme.hitSlop} accessibilityRole="button" accessibilityLabel={t('shop.sort')}>
                <MaterialCommunityIcons name="sort" size={16} color={theme.colors.textSecondary} />
                <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginLeft: 4 }]}>{t(`shop.sorts.${filters.sort}`)}</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={(
            <EmptyState
              icon="magnify"
              title={t('shop.emptyTitle')}
              message={t('shop.emptyMessage')}
              actionLabel={activeCount || search ? t('shop.resetFilters') : undefined}
              onAction={() => { setFilters(emptyShopFilters); setSearch(''); }}
            />
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: theme.spacing.md }} color={theme.colors.primary} /> : null}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ mode: 'refresh' })} tintColor={theme.colors.primary} />}
        />
      )}
      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.sortBackdrop} onPress={() => setSortOpen(false)}>
          <View style={[styles.sortBox, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg }]}>
            <Text style={[theme.typography.styles.h5, { color: theme.colors.text, marginBottom: theme.spacing.xs }]}>{t('shop.sort')}</Text>
            {SORTS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => { setFilters((f) => ({ ...f, sort: s })); setSortOpen(false); }}
                style={styles.sortRow}
                accessibilityRole="radio"
                accessibilityState={{ checked: filters.sort === s }}
              >
                <MaterialCommunityIcons
                  name={filters.sort === s ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={filters.sort === s ? theme.colors.primary : theme.colors.textTertiary}
                />
                <Text style={[theme.typography.styles.body, { color: theme.colors.text, marginLeft: theme.spacing.sm }]}>{t(`shop.sorts.${s}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <ShopFilterSheet
        visible={sheetOpen}
        facets={facets}
        total={total}
        value={filters}
        onChange={setFilters}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  crumb: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, height: 30, paddingLeft: 4, paddingRight: 10 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sortBox: { padding: 16 },
  sortRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, maxWidth: 240 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8 },
  card: { overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  imageBox: { height: 150, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '92%', height: '92%' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  availRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});
