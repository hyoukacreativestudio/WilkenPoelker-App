import React, { useState } from 'react';
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
  + f.system.length + (f.available ? 1 : 0) + (f.offer ? 1 : 0) + (f.minPrice ? 1 : 0) + (f.maxPrice ? 1 : 0);

const SORTS = ['relevance', 'price_asc', 'price_desc', 'name'];
const COLLAPSED = 12;

export default function ShopFilterSheet({ visible, facets, total, value, onChange, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState({});

  const toggle = (key, v) => {
    const list = value[key];
    onChange({ ...value, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };

  const section = (title, key, options) => {
    if (!options?.length) return null;
    const selected = value[key];
    // Keep selected options visible even when they have no hits any more
    const all = [...options, ...selected.filter((s) => !options.some((o) => o.value === s)).map((s) => ({ value: s, label: String(s), count: 0 }))];
    const shown = expanded[key] ? all : all.slice(0, COLLAPSED);
    return (
      <View style={{ marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.styles.h6, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>{title}</Text>
        <View style={styles.wrap}>
          {shown.map((o) => (
            <Chip
              key={String(o.value)}
              size="small"
              label={`${o.label} (${o.count})`}
              selected={selected.includes(o.value)}
              onPress={() => toggle(key, o.value)}
            />
          ))}
        </View>
        {all.length > COLLAPSED ? (
          <TouchableOpacity onPress={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))} style={{ marginTop: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {expanded[key] ? t('shop.showLess') : t('shop.showAll', { count: all.length })}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const switchRow = (label, key, count) => (
    <View style={[styles.switchRow, { borderBottomColor: theme.colors.divider }]}>
      <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1 }]}>{label}{count != null ? ` (${count})` : ''}</Text>
      <Switch
        value={value[key]}
        onValueChange={(v) => onChange({ ...value, [key]: v })}
        trackColor={{ true: theme.colors.primary }}
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
          <TouchableOpacity onPress={() => onChange(emptyShopFilters)} hitSlop={theme.hitSlop}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{t('shop.resetFilters')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
          <Text style={[theme.typography.styles.h6, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>{t('shop.sort')}</Text>
          <View style={[styles.wrap, { marginBottom: theme.spacing.md }]}>
            {SORTS.map((s) => (
              <Chip key={s} size="small" label={t(`shop.sorts.${s}`)} selected={value.sort === s} onPress={() => onChange({ ...value, sort: s })} />
            ))}
          </View>
          {switchRow(t('shop.onlyAvailable'), 'available', facets?.available)}
          {switchRow(t('shop.onlyOffers'), 'offer', facets?.offer)}
          <View style={{ height: theme.spacing.md }} />
          {section(t('shop.group'), 'whg', facets?.whg)}
          {section(t('shop.category'), 'category', facets?.category)}
          {section(t('shop.brand'), 'brand', facets?.brand)}
          {section(t('shop.drive'), 'drive', facets?.drive)}
          {section(t('shop.batterySystem'), 'system', facets?.system)}
          <Text style={[theme.typography.styles.h6, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>{t('shop.priceRange')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {priceInput('minPrice', facets?.price ? `${t('shop.from')} ${facets.price.min} €` : t('shop.from'))}
            <Text style={{ color: theme.colors.textSecondary }}>–</Text>
            {priceInput('maxPrice', facets?.price ? `${t('shop.to')} ${facets.price.max} €` : t('shop.to'))}
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
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  price: { flex: 1, height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  apply: { height: 50, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
