import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, useWindowDimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useScreenEdges } from '../../hooks/useScreenEdges';
import { useTheme } from '../../hooks/useTheme';
import { shopApi, shopImageUrl, SHOP_PHONE, SHOP_PHONE_LABEL } from '../../api/shop';
import { formatPrice } from '../../utils/formatters';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';

export default function ShopDetailScreen({ route, navigation }) {
  const { slug } = route.params || {};
  const safeEdges = useScreenEdges();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopApi.getProduct(slug);
      const p = res.data?.data?.product;
      setProduct(p);
      // Start on the cheapest available variant
      const vs = p?.variants || [];
      const best = vs.map((v, i) => ({ v, i })).filter(({ v }) => v.available).sort((a, b) => (a.v.price ?? Infinity) - (b.v.price ?? Infinity))[0];
      setVariantIndex(best ? best.i : 0);
      setError(false);
      if (p?.title) navigation.setOptions({ title: p.brand || t('shop.title') });
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, navigation, t]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.colors.background }]}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  if (error || !product) {
    return <EmptyState icon="alert-circle-outline" title={t('shop.loadError')} actionLabel={t('common.retry')} onAction={load} />;
  }

  const variant = product.variants[variantIndex] || product.variants[0];
  const images = product.images || [];

  // The answer arrives in the ticket chat, so the customer lands there right away.
  const sendInquiry = async () => {
    setSending(true);
    setSendError('');
    try {
      const res = await shopApi.createInquiry({ slug: product.slug, artNr: variant?.artNr, message: inquiryText.trim() || undefined });
      const ticketId = res.data?.data?.ticket?.id;
      setInquiryOpen(false);
      setInquiryText('');
      if (ticketId) navigation.navigate('Service', { screen: 'TicketDetail', params: { ticketId }, initial: false });
    } catch (e) {
      setSendError(t('shop.inquiryError', { phone: SHOP_PHONE_LABEL }));
    } finally {
      setSending(false);
    }
  };

  const specTable = (rows) => rows.map(([k, v], i) => (
    <View key={`${k}-${i}`} style={[styles.specRow, { borderBottomColor: theme.colors.divider }]}>
      <Text style={[theme.typography.styles.bodySmall, styles.specKey, { color: theme.colors.textSecondary }]}>{k}</Text>
      <Text style={[theme.typography.styles.bodySmall, styles.specVal, { color: theme.colors.text }]}>{v}</Text>
    </View>
  ));

  return (
    <SafeAreaView edges={safeEdges} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <View style={{ backgroundColor: '#FFFFFF' }}>
          {images.length ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(img) => img.url}
                onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item }) => (
                  <Image source={{ uri: shopImageUrl(item.url) }} style={{ width, height: width * 0.8 }} resizeMode="contain" />
                )}
              />
              {images.length > 1 ? (
                <View style={styles.dots}>
                  {images.map((img, i) => (
                    <View key={img.url} style={[styles.dotSmall, { backgroundColor: i === imageIndex ? theme.colors.primary : '#CCCCCC' }]} />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.noImage, { height: width * 0.5 }]}>
              <MaterialCommunityIcons name="image-off-outline" size={48} color="#9E9E9E" />
            </View>
          )}
        </View>

        <View style={{ padding: theme.spacing.md }}>
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
            {[product.brand, product.category, product.group].filter(Boolean).join(' · ')}
          </Text>
          <Text style={[theme.typography.styles.h4, { color: theme.colors.text, marginTop: 2 }]}>{product.title}</Text>

          {product.variants.length > 1 ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.styles.h6, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>{t('shop.variant')}</Text>
              <View style={styles.wrap}>
                {product.variants.map((v, i) => (
                  <Chip key={v.artNr} size="small" label={v.label || v.artNr} selected={i === variantIndex} onPress={() => setVariantIndex(i)} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.priceBox, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.md }]}>
            {variant?.price != null ? (
              <>
                {variant.isOffer && variant.uvp ? (
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary }]}>
                    {t('shop.uvp')} <Text style={{ textDecorationLine: 'line-through' }}>{formatPrice(variant.uvp)}</Text>
                  </Text>
                ) : null}
                <Text style={[theme.typography.styles.h2, { color: variant.isOffer ? theme.colors.primary : theme.colors.text }]}>
                  {variant.isOffer ? `${t('shop.ourPrice')} ` : ''}{formatPrice(variant.price)}
                </Text>
                <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>{t('shop.inclVat')}</Text>
              </>
            ) : (
              <Text style={[theme.typography.styles.h5, { color: theme.colors.text }]}>{t('shop.priceOnRequest')}</Text>
            )}
            <View style={[styles.availRow, { marginTop: theme.spacing.sm }]}>
              <MaterialCommunityIcons
                name={variant?.available ? 'check-circle' : 'clock-outline'}
                size={18}
                color={variant?.available ? theme.colors.success : theme.colors.textTertiary}
              />
              <Text style={[theme.typography.styles.bodySmall, { marginLeft: 6, color: variant?.available ? theme.colors.success : theme.colors.textSecondary, fontWeight: '600' }]}>
                {variant?.available ? t('shop.availableInStore') : t('shop.notAvailableHint')}
              </Text>
            </View>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginTop: 4 }]}>{t('shop.artNr')} {variant?.artNr}</Text>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md }]}
                onPress={() => Linking.openURL(`tel:${SHOP_PHONE}`)}
                accessibilityLabel={`${t('shop.call')} ${SHOP_PHONE_LABEL}`}
              >
                <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>{t('shop.call')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md }]}
                onPress={() => { setSendError(''); setInquiryOpen(true); }}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="message-text-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.ctaText, { color: theme.colors.primary }]}>{t('shop.inquire')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginTop: theme.spacing.sm }]}>{t('shop.noShopNote')}</Text>
          </View>

          {variant?.specs?.length || variant?.notes?.length ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <Text style={[theme.typography.styles.h5, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>{t('shop.details')}</Text>
              {specTable(variant.specs || [])}
              {(variant.notes || []).map((n, i) => (
                <Text key={`n-${i}`} style={[theme.typography.styles.bodySmall, { color: theme.colors.text, marginTop: 6 }]}>• {n}</Text>
              ))}
            </View>
          ) : null}

          {product.officialSpecs?.length ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <Text style={[theme.typography.styles.h5, { color: theme.colors.text }]}>{t('shop.manufacturerData')}</Text>
              {product.officialSource ? (
                <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginBottom: theme.spacing.sm }]}>
                  {t('shop.source', { source: product.officialSource })}
                </Text>
              ) : null}
              {specTable(product.officialSpecs)}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={inquiryOpen} transparent animationType="slide" onRequestClose={() => setInquiryOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setInquiryOpen(false)} accessibilityLabel={t('common.close')} />
          <View style={[styles.sheet, { backgroundColor: theme.colors.card, padding: theme.spacing.md }]}>
            <Text style={[theme.typography.styles.h5, { color: theme.colors.text }]}>{t('shop.inquiryTitle')}</Text>
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
              {product.title}{variant?.artNr ? ` (${t('shop.artNr')} ${variant.artNr})` : ''}
            </Text>
            <TextInput
              value={inquiryText}
              onChangeText={setInquiryText}
              placeholder={t('shop.inquiryPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={[styles.sheetInput, { color: theme.colors.text, borderColor: theme.colors.divider, marginTop: theme.spacing.md, borderRadius: theme.borderRadius.md }]}
            />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>{t('shop.inquiryNote')}</Text>
            {sendError ? <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.error, marginTop: theme.spacing.sm }]}>{sendError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md }]}
                onPress={() => setInquiryOpen(false)}
              >
                <Text style={[styles.ctaText, { color: theme.colors.primary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, opacity: sending ? 0.6 : 1 }]}
                onPress={sendInquiry}
                disabled={sending}
              >
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>{t('shop.inquirySend')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  dotSmall: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 3 },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  priceBox: { padding: 16 },
  availRow: { flexDirection: 'row', alignItems: 'center' },
  cta: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetInput: { minHeight: 110, maxHeight: 200, borderWidth: 1, padding: 12, fontSize: 15 },
  specRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  specKey: { flex: 1, paddingRight: 8 },
  specVal: { flex: 1.2, fontWeight: '600' },
});
