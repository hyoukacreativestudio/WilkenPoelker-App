import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

// Opens the app-wide search from any header.
export default function SearchButton({ color, size = 24, style }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('GlobalSearch')}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={style || { padding: 4 }}
      accessibilityRole="button"
      accessibilityLabel={t('search.open')}
    >
      <MaterialCommunityIcons name="magnify" size={size} color={color || theme.colors.text} />
    </TouchableOpacity>
  );
}
