import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { formatPrice } from '../../utils/formatters';
import Card from '../ui/Card';
import RatingStars from '../shared/RatingStars';

export default function ProductCard({ product, onPress, onFavorite, isFavorite, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { name, brand, price, salePrice, images, category, ratings } = product;
  const imageUrl = images && images.length > 0 ? images[0] : null;
  const hasDiscount = salePrice != null && salePrice < price;
  const discountPercent = hasDiscount ? Math.round(((price - salePrice) / price) * 100) : 0;

  return (
    <Card onPress={onPress} style={[{ padding: 0, overflow: 'hidden' }, style]}>
      {/* Image Container */}
      <View style={{ position: 'relative' }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: 160 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 160,
              backgroundColor: theme.colors.inputBackground,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="image-off-outline" size={40} color={theme.colors.placeholder} />
          </View>
        )}

        {/* Favorite Icon - Top Right */}
        <TouchableOpacity
          onPress={() => onFavorite && onFavorite(product)}
          style={[
            styles.favoriteButton,
            {
              backgroundColor: theme.colors.overlay,
              borderRadius: theme.borderRadius.round,
            },
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? theme.colors.error : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Sale Badge - Top Left */}
        {hasDiscount && (
          <View
            style={[
              styles.saleBadge,
              {
                backgroundColor: theme.colors.error,
                borderRadius: theme.borderRadius.sm,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
              },
            ]}
          >
            <Text style={[theme.typography.styles.small, { color: '#FFFFFF', fontWeight: theme.typography.weights.bold }]}>
              -{discountPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={{ padding: theme.spacing.sm }}>
        {/* Brand */}
        {brand ? (
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
            ]}
            numberOfLines={1}
          >
            {brand}
          </Text>
        ) : null}

        {/* Product Name */}
        <Text
          style={[
            theme.typography.styles.body,
            { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>

        {/* Rating */}
        {ratings && ratings.average != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
            <RatingStars rating={ratings.average} size={14} />
            <Text
              style={[
                theme.typography.styles.small,
                { color: theme.colors.textSecondary, marginLeft: theme.spacing.xs },
              ]}
            >
              ({ratings.count})
            </Text>
          </View>
        )}

        {/* Price Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm }}>
          {hasDiscount ? (
            <>
              <Text
                style={[
                  theme.typography.styles.body,
                  { color: theme.colors.primary, fontWeight: theme.typography.weights.bold },
                ]}
              >
                {formatPrice(salePrice)}
              </Text>
              <Text
                style={[
                  theme.typography.styles.caption,
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
            <Text
              style={[
                theme.typography.styles.body,
                { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
              ]}
            >
              {formatPrice(price)}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
});
