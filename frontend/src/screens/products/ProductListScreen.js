import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { productsApi } from '../../api/products';
import ProductCard from '../../components/product/ProductCard';
import FilterBar from '../../components/product/FilterBar';
import OfferBanner from '../../components/product/OfferBanner';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import OfflineBanner from '../../components/ui/OfflineBanner';
import { useToast } from '../../components/ui/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_GAP = 8;

export default function ProductListScreen({ category }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    sortBy: null,
    brand: null,
    inStock: false,
  });
  const [favorites, setFavorites] = useState({});
  const [offers, setOffers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const apiFunc = useCallback(
    (params) =>
      productsApi.getProducts({
        ...params,
        category,
        sortBy: filters.sortBy,
        brand: filters.brand,
        inStock: filters.inStock || undefined,
      }),
    [category, filters.sortBy, filters.brand, filters.inStock]
  );

  const {
    items: products,
    loading,
    refreshing,
    hasMore,
    error,
    fetchItems,
    loadMore,
    refresh,
  } = usePagination(apiFunc, 20);

  // Load initial data
  useEffect(() => {
    const loadInitial = async () => {
      setInitialLoading(true);
      try {
        await fetchItems();
        const [offersRes, favRes] = await Promise.all([
          productsApi.getOffers().catch(() => ({ data: { data: [] } })),
          productsApi.getFavorites().catch(() => ({ data: { data: [] } })),
        ]);
        const offersData = offersRes.data?.data || [];
        setOffers(offersData.filter((o) => o.category === category).slice(0, 3));

        const favData = favRes.data?.data || [];
        const favMap = {};
        favData.forEach((item) => {
          favMap[item._id || item.id] = true;
        });
        setFavorites(favMap);
      } catch (err) {
        // error handled by usePagination
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitial();
  }, [category]);

  // Re-fetch when filters change
  useEffect(() => {
    if (!initialLoading) {
      fetchItems();
    }
  }, [filters.sortBy, filters.brand, filters.inStock]);

  // Extract unique brands from products
  useEffect(() => {
    const uniqueBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
    if (uniqueBrands.length > 0) {
      setBrands(uniqueBrands);
    }
  }, [products]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleFavoriteToggle = useCallback(
    async (product) => {
      const productId = product._id || product.id;
      const wasFavorite = favorites[productId];

      // Optimistic update
      setFavorites((prev) => ({
        ...prev,
        [productId]: !wasFavorite,
      }));

      try {
        await productsApi.toggleFavorite(productId);
      } catch (err) {
        // Revert on failure
        setFavorites((prev) => ({
          ...prev,
          [productId]: wasFavorite,
        }));
        showToast({ type: 'error', message: t('product.favoriteError') });
      }
    },
    [favorites, t]
  );

  const handleProductPress = useCallback(
    (product) => {
      navigation.navigate('ProductDetail', {
        productId: product._id || product.id,
      });
    },
    [navigation]
  );

  const handleOfferPress = useCallback(
    (offer) => {
      navigation.navigate('ProductDetail', {
        productId: offer._id || offer.id,
      });
    },
    [navigation]
  );

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  const s = styles(theme);
  const cardWidth = (SCREEN_WIDTH - theme.spacing.md * 2 - CARD_GAP) / NUM_COLUMNS;

  // Set search button in header
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductSearch')}
            style={{ marginRight: theme.spacing.md }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, theme]);

  const renderSkeletonGrid = () => (
    <View style={s.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={[s.skeletonCard, { width: cardWidth }]}>
          <SkeletonLoader width={cardWidth} height={160} borderRadius={theme.borderRadius.lg} />
          <View style={{ padding: theme.spacing.sm, gap: theme.spacing.xs }}>
            <SkeletonLoader width={cardWidth * 0.5} height={12} />
            <SkeletonLoader width={cardWidth * 0.8} height={16} />
            <SkeletonLoader width={cardWidth * 0.4} height={14} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderOfferBanners = () => {
    if (offers.length === 0) return null;
    return (
      <View style={s.offersContainer}>
        {offers.map((offer) => (
          <OfferBanner
            key={offer._id || offer.id}
            offer={offer}
            onPress={() => handleOfferPress(offer)}
            style={{ marginBottom: theme.spacing.sm }}
          />
        ))}
      </View>
    );
  };

  const renderProduct = useCallback(
    ({ item }) => {
      const productId = item._id || item.id;
      return (
        <View style={[s.cardWrapper, { width: cardWidth }]}>
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            onFavorite={() => handleFavoriteToggle(item)}
            isFavorite={!!favorites[productId]}
            style={{ flex: 1 }}
          />
        </View>
      );
    },
    [favorites, handleProductPress, handleFavoriteToggle, cardWidth, s.cardWrapper]
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={s.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (initialLoading || loading) return null;
    return (
      <EmptyState
        icon="package-variant"
        title={t('product.noProducts')}
        message={t('product.noProductsMessage')}
        style={s.emptyState}
      />
    );
  };

  const ListHeader = useMemo(
    () => (
      <>
        {renderOfferBanners()}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          brands={brands}
        />
      </>
    ),
    [offers, filters, brands, handleFilterChange]
  );

  if (initialLoading) {
    return (
      <View style={s.container}>
        <OfflineBanner />
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          brands={[]}
        />
        {renderSkeletonGrid()}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <OfflineBanner />

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => String(item._id || item.id)}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={s.listContent}
        columnWrapperStyle={s.columnWrapper}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />

      {/* AI Chat Floating Button */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AIChat', { category })}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xxl + 60,
    },
    columnWrapper: {
      gap: CARD_GAP,
      marginBottom: CARD_GAP,
    },
    cardWrapper: {
      flex: 1,
    },
    offersContainer: {
      marginBottom: theme.spacing.sm,
    },
    skeletonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.md,
      gap: CARD_GAP,
    },
    skeletonCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      marginBottom: CARD_GAP,
    },
    footerLoader: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    emptyState: {
      paddingTop: theme.spacing.xxl,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.lg,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.lg,
      elevation: 6,
    },
  });
