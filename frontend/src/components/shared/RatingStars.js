import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const DEFAULT_STAR_COLOR = '#FFB400';

export default function RatingStars({
  rating = 0,
  size = 20,
  interactive = false,
  onRatingChange,
  color,
  style,
}) {
  const { theme } = useTheme();

  const starColor = color || DEFAULT_STAR_COLOR;

  const getStarIcon = (index) => {
    const starPosition = index + 1;
    if (rating >= starPosition) {
      return 'star';
    }
    if (rating >= starPosition - 0.5) {
      return 'star-half-full';
    }
    return 'star-outline';
  };

  const handlePress = (index) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  const stars = Array.from({ length: 5 }, (_, index) => {
    const iconName = getStarIcon(index);

    if (interactive) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(index)}
          activeOpacity={0.7}
          style={{ padding: theme.spacing.xs / 2 }}
        >
          <MaterialCommunityIcons
            name={iconName}
            size={size}
            color={starColor}
          />
        </TouchableOpacity>
      );
    }

    return (
      <MaterialCommunityIcons
        key={index}
        name={iconName}
        size={size}
        color={starColor}
        style={{ marginRight: theme.spacing.xs / 2 }}
      />
    );
  });

  return (
    <View style={[styles.container, style]}>
      {stars}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
