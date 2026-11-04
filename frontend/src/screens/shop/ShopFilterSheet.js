import React, { useMemo, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Chip from '../../components/ui/Chip';

// All product filters. Changes apply immediately (the list behind reloads), so
// the button always shows how many products are left.
export const emptyShopFilters = {
  whg: [], category: [], brand: [], drive: [], system: [],
  available: false, offer: false, minPrice: '', maxPrice: '', sort: 'relevance',
};

export const countShopFilters = (f) => f.whg.length + f.category.length + f.brand.length + f.drive.length
  + f.system.length + (f.available ? 1 : 0) + (f.offer ? 1 : 0) + (f.minPrice || f.maxPrice ? 1 : 0);

const SORTS = ['relevance', 'price_asc', 'price_desc', 'name'];
const PRICE_RANGES = [['', '100'], ['100', '500'], ['500', '1000'], ['1000', '']];
// Long lists get a search field
const SEARCH_FROM = 10;

const money = (v) => Number(v).toLocaleString('de-DE');
const plain = (s) => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
// Accessories last, the rest alphabetically
const byLabel = (a, b) => (String(a.label).startsWith('Zubehör') - String(b.label).startsWith('Zubehör'))
  || String(a.label).localeCompare(String(b.label), 'de');

export function priceLabel(t, min, max) {
  if (min && max) return t('shop.priceBetween', { from: money(min), to: money(max) });
  if (max) return t('shop.priceUpTo', { to: money(max) });
  return t('shop.priceFrom', { from: money(min) });
}

export default function ShopFilterSheet({ visible, facets, total, value, onChange, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState('category'); // one section at a time keeps it readable
  const [query, setQuery] = useState('');

  const openSection = (key) => {
    setQuery('');
    setOpen((cur) => (cur === key ? null : key));
  };

  const toggle = (key, v) => {
    const list = value[key];
    onChange({ ...value, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };

  const Header = ({ id, title, summary }) => (
    <TouchableOpacity
      onPress={() => openSection(id)}
      style={[styles.sectionHead, { paddingVertical: theme.spacing.md }]}
      accessibilityRole="button"
      accessibilityState={{ expanded: open === id }}
    >
      <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: '600' }]}>{title}</Text>
      <Text
        style={[theme.typography.styles.bodySmall, styles.summary, { color: summary ? theme.colors.primary : theme.colors.textTertiary }]}
        numberOfLines={1}
      >
        {summary || t('shop.filterAll')}
      </Text>
      <MaterialCommunityIcons name={open === id ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  const section = (title, key, options) => {
    if (!options?.length && !value[key].length) return null;
    const selected = value[key];
    // Keep selected options visible even when they have no hits any more
    const all = [...(options || []), ...selected.filter((s) => !(options || []).some((o) => o.value === s)).map((s) => ({ value: s, label: String(s), count: 0 }))];
    const labels = selected.map((s) => all.find((o) => o.value === s)?.label || String(s));
    const words = plain(query).split(/\s+/).filter(Boolean);
    const shown = all
      .filter((o) => words.every((w) => plain(o.label).includes(w)))
      .sort(byLabel);
    return (
      <View key={key} style={[styles.section, { borderBottomColor: theme.colors.divider }]}>
        <Header id={key} title={title} summary={labels.join(', ')} />
        {open === key ? (
          <View style={{ paddingBottom: theme.spacing.sm }}>
            {all.length >= SEARCH_FROM ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('shop.filterSearch')}
                placeholderTextColor={theme.colors.placeholder}
                style={[styles.search, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.xs }]}
              />
            ) : null}
            {shown.map((o) => {
              const on = selected.includes(o.value);
              return (
                <TouchableOpacity
                  key={String(o.value)}
                  onPress={() => toggle(key, o.value)}
                  style={styles.option}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <MaterialCommunityIcons
                    name={on ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={on ? theme.colors.primary : theme.colors.textTertiary}
                  />
                  <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1, marginLeft: theme.spacing.sm }]}>{o.label}</Text>
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary }]}>{o.count}</Text>
                </TouchableOpacity>
              );
            })}
            {!shown.length ? (
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, paddingVertical: theme.spacing.sm }]}>{t('shop.filterNoMatch')}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const switchRow = (label, key, count) => (
    <View style={[styles.switchRow, { borderBottomColor: theme.colors.divider }]}>
      <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>{label}</Text>
      {count != null ? <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary, marginRight: theme.spacing.sm }]}>{count}</Text> : null}
      <Switch
        value={value[key]}
        onValueChange={(v) => onChange({ ...value, [key]: v })}
        trackColor={{ true: theme.colors.primary }}
        accessibilityLabel={label}
      />
    </View>
  );

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

  const priceSummary = useMemo(
    () => (value.minPrice || value.maxPrice ? priceLabel(t, value.minPrice, value.maxPrice) : ''),
    [t, value.minPrice, value.maxPrice],
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
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{t('shop.resetFilters')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          {switchRow(t('shop.onlyAvailable'), 'available', facets?.available)}
          {switchRow(t('shop.onlyOffers'), 'offer', facets?.offer)}

          {section(t('shop.category'), 'category', facets?.category)}
          {section(t('shop.brand'), 'brand', facets?.brand)}
          {section(t('shop.drive'), 'drive', facets?.drive)}
          {section(t('shop.batterySystem'), 'system', facets?.system)}

          <View style={[styles.section, { borderBottomColor: theme.colors.divider }]}>
            <Header id="price" title={t('shop.priceRange')} summary={priceSummary} />
            {open === 'price' ? (
              <View style={{ paddingBottom: theme.spacing.md }}>
                <View style={[styles.wrap, { marginBottom: theme.spacing.sm }]}>
                  {PRICE_RANGES.map(([min, max]) => (
                    <Chip
                      key={`${min}-${max}`}
                      size="small"
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
            ) : null}
          </View>

          {section(t('shop.group'), 'whg', facets?.whg)}

          <View style={[styles.section, { borderBottomColor: theme.colors.divider }]}>
            <Header id="sort" title={t('shop.sort')} summary={value.sort !== 'relevance' ? t(`shop.sorts.${value.sort}`) : t('shop.sorts.relevance')} />
            {open === 'sort' ? (
              <View style={{ paddingBottom: theme.spacing.sm }}>
                {SORTS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => onChange({ ...value, sort: s })}
                    style={styles.option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value.sort === s }}
                  >
                    <MaterialCommunityIcons
                      name={value.sort === s ? 'radiobox-marked' : 'radiobox-blank'}
                      size={24}
                      color={value.sort === s ? theme.colors.primary : theme.colors.textTertiary}
                    />
                    <Text style={[theme.typography.styles.body, { color: theme.colors.text, marginLeft: theme.spacing.sm }]}>{t(`shop.sorts.${s}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={onClose} style={[styles.apply, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg }]}>
            <Text style={styles.applyText}>{t('shop.showResults', { count: total })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  section: { borderBottomWidth: StyleSheet.hairlineWidth },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  summary: { flex: 1, textAlign: 'right', marginHorizontal: 8 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  search: { height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  price: { flex: 1, height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  apply: { height: 50, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
