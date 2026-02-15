import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Chip from '../ui/Chip';

const SORT_OPTIONS = [
  { key: 'price_asc', labelKey: 'product.priceLowHigh', fallback: 'Price Low-High' },
  { key: 'price_desc', labelKey: 'product.priceHighLow', fallback: 'Price High-Low' },
  { key: 'newest', labelKey: 'product.newest', fallback: 'Newest' },
  { key: 'popular', labelKey: 'product.popular', fallback: 'Popular' },
];

export default function FilterBar({ filters, onFilterChange, brands = [], style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleSortChange = (sortKey) => {
    onFilterChange({
      ...filters,
      sortBy: filters.sortBy === sortKey ? null : sortKey,
    });
  };

  const handleBrandChange = (brand) => {
    onFilterChange({
      ...filters,
      brand: filters.brand === brand ? null : brand,
    });
  };

  const handleInStockToggle = () => {
    onFilterChange({
      ...filters,
      inStock: !filters.inStock,
    });
  };

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.sm,
        }}
      >
        {/* Sort Chips */}
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.key}
            label={t(option.labelKey, option.fallback)}
            selected={filters.sortBy === option.key}
            onPress={() => handleSortChange(option.key)}
            style={{ marginRight: theme.spacing.sm }}
          />
        ))}

        {/* Brand Chips */}
        {brands.map((brand) => (
          <Chip
            key={brand}
            label={brand}
            selected={filters.brand === brand}
            onPress={() => handleBrandChange(brand)}
            style={{ marginRight: theme.spacing.sm }}
          />
        ))}

        {/* In Stock Toggle */}
        <Chip
          label={t('product.inStock', 'In Stock')}
          selected={filters.inStock}
          onPress={handleInStockToggle}
        />
      </ScrollView>
    </View>
  );
}
