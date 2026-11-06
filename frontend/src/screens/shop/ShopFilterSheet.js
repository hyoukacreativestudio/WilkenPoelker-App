import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { offerOnDark } from '../../theme/colors';
import Chip from '../../components/ui/Chip';

// The filter goes from the general to the detail: first what it is (main category,
// then device), then drive, battery system, size, colour, manufacturer, price. Each
// step only appears when it can help. Changes apply at once, so the button always
// shows how many products are left.
export const emptyShopFilters = {
  main: '', category: '', drive: [], system: [], size: [], frame: [], color: [], brand: [],
  available: false, offer: false, minPrice: '', maxPrice: '', sort: 'relevance',
};

export const countShopFilters = (f) => (f.main || f.category ? 1 : 0) + f.drive.length + f.system.length + f.size.length
  + (f.frame || []).length + f.color.length + f.brand.length + (f.available ? 1 : 0) + (f.offer ? 1 : 0) + (f.minPrice || f.maxPrice ? 1 : 0);

const PRICE_RANGES = [['', '100'], ['100', '500'], ['500', '1000'], ['1000', '']];
const BRANDS_SHOWN = 6;

const money = (v) => Number(v).toLocaleString('de-DE');
// Accessories last, the rest alphabetically
const byLabel = (a, b) => (String(a.label).startsWith('Zubehör') - String(b.label).startsWith('Zubehör'))
  || String(a.label).localeCompare(String(b.label), 'de');

export function priceLabel(t, min, max) {
  if (min && max) return t('shop.priceBetween', { from: money(min), to: money(max) });
  if (max) return t('shop.priceUpTo', { to: money(max) });
  return t('shop.priceFrom', { from: money(min) });
}

// Choosing something higher up clears the details below it, which would no longer fit
export const chooseMain = (f, main) => ({ ...f, main, category: '', size: [], frame: [], color: [] });
export const chooseDevice = (f, category) => ({ ...f, category, size: [], color: [] });

export default function ShopFilterSheet({ visible, facets, total, value, onChange, onClose }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const linkColor = isDark ? offerOnDark : theme.colors.primary;
  const [allBrands, setAllBrands] = useState(false);

  const toggle = (key, v) => {
    const list = value[key];
    const next = { ...value, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    if (key === 'drive' && !next.drive.includes('akku')) next.system = [];
    onChange(next);
  };

  // Selected values stay visible even if they have no hits any more
  const withSelected = (options, selected) => [
    ...(options || []),
    ...selected.filter((s) => !(options || []).some((o) => o.value === s)).map((s) => ({ value: s, label: String(s), count: 0 })),
  ];

  const title = (label) => (
    <Text style={[theme.typography.styles.bodySmall, styles.title, { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }]}>{label}</Text>
  );

  const chipGroup = (label, key, options, { minOptions = 2 } = {}) => {
    const selected = value[key];
    const all = withSelected(options, selected);
    if (all.length < minOptions && !selected.length) return null;
    return (
      <View key={key} style={[styles.block, { borderTopColor: theme.colors.divider }]}>
        {title(label)}
        <View style={styles.wrap}>
          {all.map((o) => (
            <Chip
              key={String(o.value)}
              label={`${o.label} (${o.count})`}
              selected={selected.includes(o.value)}
              onPress={() => toggle(key, o.value)}
            />
          ))}
        </View>
      </View>
    );
  };

  // Level one and two: what it is
  const categoryRow = ({ label, count, on, chevron, first, onPress }) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider }]}
      accessibilityRole={chevron ? 'button' : 'radio'}
      accessibilityState={chevron ? undefined : { checked: on }}
    >
      {chevron ? null : (
        <MaterialCommunityIcons
          name={on ? 'radiobox-marked' : 'radiobox-blank'}
          size={22}
          color={on ? linkColor : theme.colors.textTertiary}
          style={{ marginRight: theme.spacing.sm }}
        />
      )}
      <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1, fontWeight: on ? '600' : '400' }]}>{label}</Text>
      {count != null ? <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary, marginLeft: theme.spacing.sm }]}>{count}</Text> : null}
      {chevron ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textTertiary} style={{ marginLeft: 4 }} /> : null}
    </TouchableOpacity>
  );

  const devices = [...(facets?.category || [])].sort(byLabel);

  const categoryBlock = !value.main ? (
    <View>
      {title(t('shop.mainCategory'))}
      {(facets?.main || []).map((m, i) => categoryRow({
        label: m.label, count: m.count, chevron: true, first: i === 0, onPress: () => onChange(chooseMain(value, m.value)),
      }))}
    </View>
  ) : (
    <View>
      <TouchableOpacity
        onPress={() => onChange(chooseMain(value, ''))}
        style={[styles.back, { marginBottom: theme.spacing.xs }]}
        accessibilityRole="button"
        hitSlop={theme.hitSlop}
      >
        <MaterialCommunityIcons name="chevron-left" size={22} color={linkColor} />
        <Text style={{ color: linkColor, fontWeight: '600' }}>{t('shop.allCategories')}</Text>
      </TouchableOpacity>
      <Text style={[theme.typography.styles.h5, { color: theme.colors.text, marginBottom: theme.spacing.xs }]}>{value.main}</Text>
      {devices.length > 1 || value.category ? (
        <>
          {categoryRow({
            label: t('shop.allInCategory'), on: !value.category, first: true, onPress: () => onChange(chooseDevice(value, '')),
          })}
          {devices.map((d) => categoryRow({
            label: d.label, count: d.count, on: value.category === d.value, onPress: () => onChange(chooseDevice(value, d.value)),
          }))}
        </>
      ) : null}
    </View>
  );

  const brands = [...withSelected(facets?.brand, value.brand)];
  const shownBrands = allBrands ? brands : brands.filter((b, i) => i < BRANDS_SHOWN || value.brand.includes(b.value));

  const priceInput = (key, placeholder) => (
    <TextInput
      value={value[key]}
      onChangeText={(v) => onChange({ ...value, [key]: v.replace(/[^0-9]/g, '') })}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={theme.colors.placeholder}
      accessibilityLabel={placeholder}
      style={[styles.price, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md }]}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={onClose} hitSlop={theme.hitSlop} accessibilityLabel={t('common.close')}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[theme.typography.styles.h5, { color: theme.colors.text, flex: 1, marginLeft: theme.spacing.md }]}>{t('shop.filters')}</Text>
          <TouchableOpacity onPress={() => onChange({ ...emptyShopFilters, sort: value.sort })} hitSlop={theme.hitSlop}>
            <Text style={{ color: linkColor, fontWeight: '600' }}>{t('shop.resetFilters')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          {categoryBlock}

          {chipGroup(t('shop.drive'), 'drive', facets?.drive)}
          {value.drive.includes('akku') ? chipGroup(t('shop.batterySystem'), 'system', facets?.system) : null}
          {chipGroup(t('shop.frame'), 'frame', facets?.frame)}
          {value.category && facets?.size?.label ? chipGroup(facets.size.label, 'size', facets.size.options) : null}
          {value.category ? chipGroup(t('shop.color'), 'color', facets?.color) : null}

          {brands.length > 1 || value.brand.length ? (
            <View style={[styles.block, { borderTopColor: theme.colors.divider }]}>
              {title(t('shop.brand'))}
              <View style={styles.wrap}>
                {shownBrands.map((o) => (
                  <Chip
                    key={String(o.value)}
                    label={`${o.label} (${o.count})`}
                    selected={value.brand.includes(o.value)}
                    onPress={() => toggle('brand', o.value)}
                  />
                ))}
              </View>
              {brands.length > BRANDS_SHOWN ? (
                <TouchableOpacity onPress={() => setAllBrands((v) => !v)} hitSlop={theme.hitSlop} style={{ marginTop: theme.spacing.sm }} accessibilityRole="button">
                  <Text style={{ color: linkColor, fontWeight: '600' }}>
                    {allBrands ? t('shop.showLess') : t('shop.showAll', { count: brands.length })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.block, { borderTopColor: theme.colors.divider }]}>
            {title(t('shop.priceRange'))}
            <View style={[styles.wrap, { marginBottom: theme.spacing.sm }]}>
              {PRICE_RANGES.map(([min, max]) => (
                <Chip
                  key={`${min}-${max}`}
                  label={priceLabel(t, min, max)}
                  selected={value.minPrice === min && value.maxPrice === max}
                  onPress={() => onChange(value.minPrice === min && value.maxPrice === max
                    ? { ...value, minPrice: '', maxPrice: '' }
                    : { ...value, minPrice: min, maxPrice: max })}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              {priceInput('minPrice', facets?.price ? `${t('shop.from')} ${money(facets.price.min)} €` : t('shop.from'))}
              <Text style={{ color: theme.colors.textSecondary }}>–</Text>
              {priceInput('maxPrice', facets?.price ? `${t('shop.to')} ${money(facets.price.max)} €` : t('shop.to'))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={onClose} style={[styles.apply, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg }]} accessibilityRole="button">
            <Text style={styles.applyText}>{t('shop.showResults', { count: total })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  block: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 20, paddingTop: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -4 },
  price: { flex: 1, height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  apply: { height: 50, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
