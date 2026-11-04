import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { shopApi, shopImageUrl } from '../../api/shop';
import { formatPrice } from '../../utils/formatters';
import { offerOnDark } from '../../theme/colors';

// Current discounts on the home screen. Comes straight from the stock data, so a
// new discount appears here by itself, the strongest reductions first.
export default function OfferStrip({ refreshKey }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const offerColor = isDark ? offerOnDark : theme.colors.primary;
  const navigation = useNavigation();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await shopApi.getProducts({ offer: '1', available: '1', limit: 12 });
      setItems((res.data?.data?.items || []).filter((p) => p.discountPercent > 0));
    } catch (e) {
      setItems([]); // the feed works without this strip
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!items.length) return null;

  return (
    <View style={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md, alignSelf: 'stretch' }}>
      <View style={[styles.head, { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }]}>
        <Text style={[theme.typography.styles.h5, { color: theme.colors.text }]}>{t('shop.offersTitle')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Shop', { screen: 'ShopList', params: { offers: Date.now() }, pop: true })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.more}
          accessibilityRole="button"
        >
          <Text style={[theme.typography.styles.bodySmall, { color: offerColor, fontWeight: '600' }]}>{t('shop.offersAll')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={offerColor} />
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => p.slug}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Shop', { screen: 'ShopDetail', params: { slug: item.slug, title: item.title }, initial: false })}
            style={[styles.card, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${t('shop.discount', { percent: item.discountPercent })}`}
          >
            <View style={[styles.imageBox, { borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg }]}>
              {item.image ? (
                <Image source={{ uri: shopImageUrl(item.image) }} style={styles.image} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="image-off-outline" size={32} color="#9E9E9E" />
              )}
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.badgeText}>
                  {item.discountUpTo ? `${t('shop.upTo')} ` : ''}{t('shop.discount', { percent: item.discountPercent })}
                </Text>
              </View>
            </View>
            <View style={{ padding: theme.spacing.sm, flex: 1 }}>
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>{item.title}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[theme.typography.styles.h6, { color: offerColor, marginTop: 4 }]}>
                {item.variantCount > 1 ? `${t('shop.from')} ` : ''}{formatPrice(item.price)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  more: { flexDirection: 'row', alignItems: 'center' },
  card: { width: 160, minHeight: 222, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  imageBox: { height: 126, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '90%', height: '90%' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
