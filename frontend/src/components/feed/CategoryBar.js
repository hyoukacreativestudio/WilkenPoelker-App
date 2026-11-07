import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// Service bar on the start page. The four buttons open the service pages
// (questions, tickets, repair or appointment requests) - not products, so the
// bar says so in its title and every icon carries a small "question" bubble.
const CATEGORIES = [
  { key: 'service', labelKey: 'feed.serviceBarGeneral', fallback: 'Allgemein', nav: { screen: 'Service' }, icon: require('../../../assets/tab_service.png') },
  { key: 'bikes', labelKey: 'feed.serviceBarBike', fallback: 'Fahrrad', nav: { screen: 'Service', params: { screen: 'CategoryService', params: { category: 'bike' } } }, icon: require('../../../assets/tab_bike.png') },
  { key: 'cleaning', labelKey: 'feed.serviceBarCleaning', fallback: 'Reinigung', nav: { screen: 'Service', params: { screen: 'CategoryService', params: { category: 'cleaning' } } }, icon: require('../../../assets/tab_cleaning.png') },
  { key: 'motor', labelKey: 'feed.serviceBarMotor', fallback: 'Motorgeräte', nav: { screen: 'Service', params: { screen: 'CategoryService', params: { category: 'motor' } } }, icon: require('../../../assets/tab_motor.png') },
];

export default function CategoryBar() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const open = (cat) => {
    if (cat.nav.params) navigation.navigate(cat.nav.screen, cat.nav.params);
    else navigation.navigate(cat.nav.screen);
  };

  return (
    <View
      style={[s.container, { backgroundColor: theme.colors.tabsBackground, borderBottomColor: theme.colors.divider }]}
      accessibilityLabel={t('feed.serviceBarA11y', 'Service und Hilfe: Frage stellen, Reparatur oder Termin anfragen')}
    >
      {/* Title: says what the buttons are for */}
      <TouchableOpacity style={s.titleRow} activeOpacity={0.7} onPress={() => open(CATEGORIES[0])}>
        <MaterialCommunityIcons name="face-agent" size={18} color={theme.colors.primary} />
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={[s.title, { color: theme.colors.primary, fontWeight: theme.typography.weights.bold }]} numberOfLines={1}>
            {t('feed.serviceBarTitle', 'Service & Hilfe')}
          </Text>
          <Text style={[s.hint, { color: theme.colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t('feed.serviceBarHint', 'Gerät antippen – Frage stellen, Reparatur oder Termin anfragen')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
      </TouchableOpacity>

      <View style={s.row}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[s.item, { backgroundColor: theme.colors.card, borderColor: theme.colors.divider }]}
            activeOpacity={0.7}
            onPress={() => open(cat)}
            accessibilityRole="button"
          >
            <View>
              <Image source={cat.icon} style={s.icon} resizeMode="contain" />
              <View style={[s.bubble, { backgroundColor: theme.colors.primary, borderColor: theme.colors.card }]}>
                <MaterialCommunityIcons name="chat-question" size={10} color="#FFFFFF" />
              </View>
            </View>
            <Text
              style={[s.label, { color: theme.colors.text, fontWeight: theme.typography.weights.medium }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {t(cat.labelKey, cat.fallback)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  hint: {
    fontSize: 11,
    lineHeight: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 34,
    height: 34,
    marginBottom: 4,
  },
  bubble: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
});
