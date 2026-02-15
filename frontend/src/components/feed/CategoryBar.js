import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

const CATEGORIES = [
  { key: 'service', labelKey: 'navigation.service', nav: { screen: 'Service' }, icon: require('../../../assets/tab_service.png') },
  { key: 'bikes', labelKey: 'products.bikes', nav: { screen: 'Service', params: { screen: 'CategoryService', params: { category: 'bike' } } }, icon: require('../../../assets/tab_bike.png'), whiteBg: true },
  { key: 'cleaning', labelKey: 'products.cleaning', nav: { screen: 'Service', params: { screen: 'CategoryService', params: { category: 'cleaning' } } }, icon: require('../../../assets/tab_cleaning.png'), whiteBg: true },
  { key: 'motor', labelKey: 'products.motor', nav: { screen: 'Service', params: { screen: 'CategoryService', params: { category: 'motor' } } }, icon: require('../../../assets/tab_motor.png') },
];

export default function CategoryBar() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[s.container, { backgroundColor: theme.colors.tabsBackground, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }]}>
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.key}
          style={s.item}
          activeOpacity={0.7}
          onPress={() => {
            if (cat.nav.params) {
              navigation.navigate(cat.nav.screen, cat.nav.params);
            } else {
              navigation.navigate(cat.nav.screen);
            }
          }}
        >
          <Image source={cat.icon} style={s.icon} resizeMode="contain" />
          <Text
            style={[
              s.label,
              {
                color: theme.colors.text,
                fontWeight: theme.typography.weights.medium,
              },
            ]}
            numberOfLines={2}
          >
            {t(cat.labelKey, cat.key)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  icon: {
    width: 36,
    height: 36,
    marginBottom: 4,
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
});
