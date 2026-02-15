import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { formatPrice, formatDate } from '../../utils/formatters';

export default function OfferBanner({ offer, onPress, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { name, salePrice, price, images, saleEndsAt } = offer;
  const imageUrl = images && images.length > 0 ? images[0] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.primary,
          ...theme.shadows.md,
        },
        style,
      ]}
    >
      {/* Product Image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 80, height: 80, margin: theme.spacing.sm }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 80,
            height: 80,
            margin: theme.spacing.sm,
            backgroundColor: theme.colors.inputBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.sm,
          }}
        />
      )}

      {/* Details */}
      <View
        style={{
          flex: 1,
          paddingVertical: theme.spacing.sm,
          paddingRight: theme.spacing.md,
          justifyContent: 'center',
        }}
      >
        {/* Sale Badge */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: theme.colors.error,
            borderRadius: theme.borderRadius.sm,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            marginBottom: theme.spacing.xs,
          }}
        >
          <Text
            style={[
              theme.typography.styles.small,
              { color: '#FFFFFF', fontWeight: theme.typography.weights.bold },
            ]}
          >
            {t('product.sale', 'SALE')}
          </Text>
        </View>

        {/* Product Name */}
        <Text
          style={[
            theme.typography.styles.body,
            { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>

        {/* Prices */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
          <Text
            style={[
              theme.typography.styles.caption,
              {
                color: theme.colors.textTertiary,
                textDecorationLine: 'line-through',
                marginRight: theme.spacing.sm,
              },
            ]}
          >
            {formatPrice(price)}
          </Text>
          <Text
            style={[
              theme.typography.styles.h5,
              { color: theme.colors.primary },
            ]}
          >
            {formatPrice(salePrice)}
          </Text>
        </View>

        {/* Ends Date */}
        {saleEndsAt && (
          <Text
            style={[
              theme.typography.styles.small,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
            ]}
          >
            {t('product.endsOn', 'Ends:')} {formatDate(saleEndsAt)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
