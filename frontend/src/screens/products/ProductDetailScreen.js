import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { productsApi } from '../../api/products';
import { formatPrice, formatDate } from '../../utils/formatters';
import RatingStars from '../../components/shared/RatingStars';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sharing, setSharing] = useState(false);

  const scrollViewRef = useRef(null);
  const reviewsSectionRef = useRef(null);
  const reviewsYPosition = useRef(0);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productsApi.getProduct(productId);
      const data = response.data?.data || response.data;
      setProduct(data);
      setIsFavorite(data.isFavorite || false);
    } catch (err) {
      setError(err.response?.data?.message || t('common.errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      await productsApi.toggleFavorite(productId);
    } catch (err) {
      setIsFavorite(prev);
      showToast({ type: 'error', message: t('product.favoriteError') });
    }
  };

  const handleShare = async () => {
    if (!product) return;
    setSharing(true);
    try {
      const result = await Share.share({
        message: `${product.name} - ${formatPrice(product.salePrice || product.price)}`,
        title: product.name,
      });
      if (result.action === Share.sharedAction) {
        const channel = result.activityType || 'unknown';
        await productsApi.trackShare(productId, channel).catch(() => {});
      }
    } catch (err) {
      // Share cancelled or failed silently
    } finally {
      setSharing(false);
    }
  };

  const handleScrollToReviews = () => {
    if (scrollViewRef.current && reviewsYPosition.current > 0) {
      scrollViewRef.current.scrollTo({
        y: reviewsYPosition.current,
        animated: true,
      });
    }
  };

  const handleImageScroll = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setActiveImageIndex(index);
  }, []);

  const handleWriteReview = () => {
    // Navigate to a review creation flow or show modal
    showToast({ type: 'info', message: t('product.writeReviewMessage') });
  };

  const s = styles(theme);

  if (loading) {
    return (
      <View style={s.container}>
        <SkeletonLoader width={SCREEN_WIDTH} height={IMAGE_HEIGHT} borderRadius={0} />
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
          <SkeletonLoader width={SCREEN_WIDTH * 0.3} height={14} />
          <SkeletonLoader width={SCREEN_WIDTH * 0.7} height={22} />
          <SkeletonLoader width={SCREEN_WIDTH * 0.4} height={28} />
          <SkeletonLoader width={SCREEN_WIDTH * 0.5} height={16} />
          <SkeletonLoader width={SCREEN_WIDTH - theme.spacing.md * 2} height={100} />
        </View>
        {/* Back button overlay even while loading */}
        <TouchableOpacity
          style={[s.backButton, { backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.3)' }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={s.container}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.error')}
          message={error || t('product.notFound')}
          actionLabel={t('common.retry')}
          onAction={loadProduct}
        />
        <TouchableOpacity
          style={[s.backButton, { backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.3)' }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const {
    name,
    brand,
    price,
    salePrice,
    images = [],
    description,
    specifications,
    ratings,
    reviews = [],
  } = product;

  const hasDiscount = salePrice != null && salePrice < price;
  const discountPercent = hasDiscount
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Image Gallery */}
        <View style={s.imageContainer}>
          {images.length > 0 ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleImageScroll}
              keyExtractor={(item, index) => `img-${index}`}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={s.productImage}
                  resizeMode="cover"
                />
              )}
            />
          ) : (
            <View style={[s.productImage, s.imagePlaceholder]}>
              <MaterialCommunityIcons
                name="image-off-outline"
                size={64}
                color={theme.colors.textTertiary}
              />
            </View>
          )}

          {/* Page Dots */}
          {images.length > 1 && (
            <View style={s.dotsContainer}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    s.dot,
                    {
                      backgroundColor:
                        index === activeImageIndex
                          ? theme.colors.primary
                          : 'rgba(255,255,255,0.6)',
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Sale Badge */}
          {hasDiscount && (
            <View style={[s.saleBadge, { backgroundColor: theme.colors.error }]}>
              <Text style={[theme.typography.styles.bodySmall, { color: '#FFFFFF', fontWeight: theme.typography.weights.bold }]}>
                -{discountPercent}%
              </Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={[s.backButton, { backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.3)' }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity
            style={[s.favoriteButton, { backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.3)' }]}
            onPress={handleFavoriteToggle}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? theme.colors.error : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={s.infoSection}>
          {/* Brand */}
          {brand ? (
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>
              {brand}
            </Text>
          ) : null}

          {/* Name */}
          <Text style={[theme.typography.styles.h3, { color: theme.colors.text, marginTop: theme.spacing.xs }]}>
            {name}
          </Text>

          {/* Price Section */}
          <View style={s.priceRow}>
            {hasDiscount ? (
              <>
                <Text
                  style={[
                    theme.typography.styles.h2,
                    { color: theme.colors.primary },
                  ]}
                >
                  {formatPrice(salePrice)}
                </Text>
                <Text
                  style={[
                    theme.typography.styles.body,
                    {
                      color: theme.colors.textTertiary,
                      textDecorationLine: 'line-through',
                      marginLeft: theme.spacing.sm,
                    },
                  ]}
                >
                  {formatPrice(price)}
                </Text>
              </>
            ) : (
              <Text style={[theme.typography.styles.h2, { color: theme.colors.text }]}>
                {formatPrice(price)}
              </Text>
            )}
          </View>
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginTop: 2 }]}>
            {t('product.inclVat')}
          </Text>

          {/* Rating */}
          {ratings && ratings.average != null && (
            <TouchableOpacity
              style={s.ratingRow}
              onPress={handleScrollToReviews}
              activeOpacity={0.7}
            >
              <RatingStars rating={ratings.average} size={18} />
              <Text
                style={[
                  theme.typography.styles.bodySmall,
                  { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm },
                ]}
              >
                {ratings.average.toFixed(1)} ({ratings.count || 0} {t('product.reviews')})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: theme.colors.divider }]} />

        {/* Description */}
        {description ? (
          <View style={s.section}>
            <Text style={[theme.typography.styles.h5, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
              {t('product.description')}
            </Text>
            <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, lineHeight: 22 }]}>
              {description}
            </Text>
          </View>
        ) : null}

        {/* Specifications */}
        {specifications && Object.keys(specifications).length > 0 && (
          <>
            <View style={[s.divider, { backgroundColor: theme.colors.divider }]} />
            <View style={s.section}>
              <Text style={[theme.typography.styles.h5, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
                {t('product.specifications')}
              </Text>
              {Object.entries(specifications).map(([key, value]) => (
                <View key={key} style={s.specRow}>
                  <Text
                    style={[
                      theme.typography.styles.bodySmall,
                      { color: theme.colors.textSecondary, flex: 1 },
                    ]}
                  >
                    {key}
                  </Text>
                  <Text
                    style={[
                      theme.typography.styles.bodySmall,
                      { color: theme.colors.text, flex: 1, textAlign: 'right', fontWeight: theme.typography.weights.medium },
                    ]}
                  >
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Reviews */}
        <View style={[s.divider, { backgroundColor: theme.colors.divider }]} />
        <View
          style={s.section}
          onLayout={(event) => {
            reviewsYPosition.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={s.sectionHeader}>
            <Text style={[theme.typography.styles.h5, { color: theme.colors.text }]}>
              {t('product.reviewsTitle')} ({reviews.length})
            </Text>
            <Button
              title={t('product.writeReview')}
              onPress={handleWriteReview}
              variant="outline"
              size="small"
            />
          </View>

          {reviews.length > 0 ? (
            reviews.map((review, index) => (
              <View
                key={review._id || review.id || index}
                style={[
                  s.reviewCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                  },
                ]}
              >
                <View style={s.reviewHeader}>
                  <RatingStars rating={review.rating} size={14} />
                  <Text
                    style={[
                      theme.typography.styles.caption,
                      { color: theme.colors.textTertiary, marginLeft: theme.spacing.sm },
                    ]}
                  >
                    {formatDate(review.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    theme.typography.styles.bodySmall,
                    {
                      color: theme.colors.text,
                      fontWeight: theme.typography.weights.semiBold,
                      marginTop: theme.spacing.xs,
                    },
                  ]}
                >
                  {review.userName || review.user?.name || t('product.anonymous')}
                </Text>
                {review.text ? (
                  <Text
                    style={[
                      theme.typography.styles.body,
                      { color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
                    ]}
                  >
                    {review.text}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text
              style={[
                theme.typography.styles.body,
                {
                  color: theme.colors.textTertiary,
                  textAlign: 'center',
                  paddingVertical: theme.spacing.lg,
                },
              ]}
            >
              {t('product.noReviews')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Footer Share Button */}
      <View style={[s.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <Button
          title={t('product.share')}
          onPress={handleShare}
          variant="outline"
          loading={sharing}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
    },
    imageContainer: {
      position: 'relative',
      width: SCREEN_WIDTH,
      height: IMAGE_HEIGHT,
      backgroundColor: theme.colors.surface,
    },
    productImage: {
      width: SCREEN_WIDTH,
      height: IMAGE_HEIGHT,
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    dotsContainer: {
      position: 'absolute',
      bottom: theme.spacing.md,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    saleBadge: {
      position: 'absolute',
      top: theme.spacing.md,
      left: theme.spacing.md + 48,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : theme.spacing.md,
      left: theme.spacing.md,
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    favoriteButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : theme.spacing.md,
      right: theme.spacing.md,
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoSection: {
      padding: theme.spacing.md,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: theme.spacing.sm,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    divider: {
      height: 1,
      marginHorizontal: theme.spacing.md,
    },
    section: {
      padding: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    specRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    reviewCard: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: 1,
    },
  });
