import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import { productsApi } from '../../api/products';
import SearchBar from '../../components/ui/SearchBar';
import ProductCard from '../../components/product/ProductCard';
import EmptyState from '../../components/ui/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_GAP = 8;
const RECENT_SEARCHES_KEY = '@product_recent_searches';
const MAX_RECENT = 5;

export default function ProductSearchScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState({});

  const debouncedQuery = useDebounce(query, 300);
  const cardWidth = (SCREEN_WIDTH - theme.spacing.md * 2 - CARD_GAP) / NUM_COLUMNS;

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
    loadFavorites();
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      performSearch(debouncedQuery.trim());
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [debouncedQuery]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      // Silently fail
    }
  };

  const loadFavorites = async () => {
    try {
      const res = await productsApi.getFavorites();
      const favData = res.data?.data || [];
      const favMap = {};
      favData.forEach((item) => {
        favMap[item._id || item.id] = true;
      });
      setFavorites(favMap);
    } catch (err) {
      // Silently fail
    }
  };

  const saveRecentSearch = async (searchQuery) => {
    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (err) {
      // Silently fail
    }
  };

  const performSearch = async (searchQuery) => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await productsApi.searchProducts(searchQuery);
      const data = response.data?.data?.items || response.data?.data || [];
      setResults(data);
      saveRecentSearch(searchQuery);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearched(false);
  }, []);

  const handleRecentSearchPress = useCallback((searchTerm) => {
    setQuery(searchTerm);
  }, []);

  const handleRemoveRecent = useCallback(
    async (searchTerm) => {
      const updated = recentSearches.filter((s) => s !== searchTerm);
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        // Silently fail
      }
    },
    [recentSearches]
  );

  const handleProductPress = useCallback(
    (product) => {
      navigation.navigate('ProductDetail', {
        productId: product._id || product.id,
      });
    },
    [navigation]
  );

  const handleFavoriteToggle = useCallback(
    async (product) => {
      const productId = product._id || product.id;
      const wasFavorite = favorites[productId];

      setFavorites((prev) => ({ ...prev, [productId]: !wasFavorite }));

      try {
        await productsApi.toggleFavorite(productId);
      } catch (err) {
        setFavorites((prev) => ({ ...prev, [productId]: wasFavorite }));
      }
    },
    [favorites]
  );

  const s = styles(theme);

  const renderProduct = useCallback(
    ({ item }) => {
      const productId = item._id || item.id;
      return (
        <View style={{ width: cardWidth }}>
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
    [favorites, handleProductPress, handleFavoriteToggle, cardWidth]
  );

  const renderPreSearchContent = () => (
    <View style={s.preSearchContainer}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={s.recentSection}>
          <Text style={[theme.typography.styles.h6, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
            {t('search.recentSearches')}
          </Text>
          {recentSearches.map((term) => (
            <TouchableOpacity
              key={term}
              style={s.recentItem}
              onPress={() => handleRecentSearchPress(term)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="history"
                size={20}
                color={theme.colors.textTertiary}
              />
              <Text
                style={[
                  theme.typography.styles.body,
                  { color: theme.colors.text, flex: 1, marginLeft: theme.spacing.sm },
                ]}
                numberOfLines={1}
              >
                {term}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveRecent(term)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Suggested / Popular */}
      <View style={s.suggestedSection}>
        <Text style={[theme.typography.styles.h6, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
          {t('search.popularSearches')}
        </Text>
        <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary }]}>
          {t('search.trySearching')}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (!searched) return renderPreSearchContent();

    return (
      <EmptyState
        icon="magnify-close"
        title={t('search.noResults')}
        message={t('search.noResultsMessage', { query: debouncedQuery })}
        style={s.emptyState}
      />
    );
  };

  return (
    <View style={s.container}>
      {/* Header with SearchBar and Back */}
      <View style={[s.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.searchProducts')}
          onClear={handleClear}
          autoFocus
          style={s.searchBar}
        />
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {/* Results */}
      {searched && results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item._id || item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={s.listContent}
          columnWrapperStyle={s.columnWrapper}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        renderEmpty()
      )}
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
    },
    backButton: {
      marginRight: theme.spacing.sm,
    },
    searchBar: {
      flex: 1,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    columnWrapper: {
      gap: CARD_GAP,
      marginBottom: CARD_GAP,
    },
    preSearchContainer: {
      padding: theme.spacing.md,
    },
    recentSection: {
      marginBottom: theme.spacing.lg,
    },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    suggestedSection: {
      marginTop: theme.spacing.sm,
    },
    emptyState: {
      paddingTop: theme.spacing.xxl,
    },
  });
