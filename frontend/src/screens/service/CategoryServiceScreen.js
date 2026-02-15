import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import EditableFAQSection from '../../components/service/EditableFAQSection';
import Button from '../../components/ui/Button';

const CATEGORY_CONFIG = {
  bike: {
    titleKey: 'categoryService.bikeTitle',
    descriptionKey: 'categoryService.bikeDescription',
    icon: require('../../../assets/tab_bike.png'),
    ticketType: 'bike_question',
    services: [
      { icon: 'wrench', labelKey: 'categoryService.bikeServices.inspection' },
      { icon: 'cog', labelKey: 'categoryService.bikeServices.repair' },
      { icon: 'bicycle', labelKey: 'categoryService.bikeServices.consultation' },
      { icon: 'file-document-outline', labelKey: 'categoryService.bikeServices.leasing' },
    ],
  },
  cleaning: {
    titleKey: 'categoryService.cleaningTitle',
    descriptionKey: 'categoryService.cleaningDescription',
    icon: require('../../../assets/tab_cleaning.png'),
    ticketType: 'cleaning_question',
    services: [
      { icon: 'wrench', labelKey: 'categoryService.cleaningServices.repair' },
      { icon: 'cog', labelKey: 'categoryService.cleaningServices.maintenance' },
      { icon: 'account-question', labelKey: 'categoryService.cleaningServices.consultation' },
      { icon: 'package-variant', labelKey: 'categoryService.cleaningServices.spareParts' },
    ],
  },
  motor: {
    titleKey: 'categoryService.motorTitle',
    descriptionKey: 'categoryService.motorDescription',
    icon: require('../../../assets/tab_motor.png'),
    ticketType: 'motor_question',
    services: [
      { icon: 'wrench', labelKey: 'categoryService.motorServices.repair' },
      { icon: 'cog', labelKey: 'categoryService.motorServices.maintenance' },
      { icon: 'shield-check', labelKey: 'categoryService.motorServices.safetyCheck' },
      { icon: 'account-question', labelKey: 'categoryService.motorServices.consultation' },
    ],
  },
};

export default function CategoryServiceScreen({ route, navigation }) {
  const { category } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const config = CATEGORY_CONFIG[category];

  const [servicesOpen, setServicesOpen] = useState(false);

  const handleCreateTicket = useCallback(() => {
    navigation.navigate('CreateTicket', { preselectedType: config.ticketType });
  }, [navigation, config.ticketType]);

  const handleCallPhone = () => {
    Linking.openURL('tel:+4954319876543');
  };

  const handleOpenAiChat = useCallback(() => {
    navigation.navigate('ServiceAiChat', { category });
  }, [navigation, category]);

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero Section */}
        <View style={s.heroSection}>
          <Image source={config.icon} style={s.heroIcon} resizeMode="contain" />
          <Text style={s.heroTitle}>{t(config.titleKey)}</Text>
          <Text style={s.heroDescription}>{t(config.descriptionKey)}</Text>
        </View>

        {/* AI Chat CTA */}
        <TouchableOpacity
          style={s.aiChatBanner}
          activeOpacity={0.8}
          onPress={handleOpenAiChat}
        >
          <View style={s.aiChatBannerIcon}>
            <MaterialCommunityIcons name="robot-outline" size={28} color={theme.colors.primary} />
          </View>
          <View style={s.aiChatBannerContent}>
            <Text style={s.aiChatBannerTitle}>{t('aiChat.bannerTitle')}</Text>
            <Text style={s.aiChatBannerSubtitle}>{t(`aiChat.bannerSubtitle.${category}`)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* FAQ Section */}
        <EditableFAQSection category={category} title={t('service.faqTitle')} />

        {/* Ticket CTA */}
        <View style={[s.section, { paddingHorizontal: theme.spacing.md }]}>
          <View style={s.ticketCta}>
            <MaterialCommunityIcons name="face-agent" size={28} color={theme.colors.textSecondary} />
            <Text style={s.ticketCtaText}>
              {t('categoryService.aiCantHelp')}
            </Text>
            <Button
              title={t('categoryService.openTicket')}
              onPress={handleCreateTicket}
              variant="primary"
              fullWidth
            />
          </View>
        </View>

        {/* Unsere Leistungen (collapsible, not clickable) */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.servicesHeader}
            activeOpacity={0.7}
            onPress={() => setServicesOpen((prev) => !prev)}
          >
            <Text style={s.sectionTitle}>{t('categoryService.ourServices')}</Text>
            <MaterialCommunityIcons
              name={servicesOpen ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {servicesOpen && (
            <View>
              <View style={s.servicesGrid}>
                {config.services.map((svc, index) => (
                  <View key={index} style={s.serviceCard}>
                    <View style={[s.serviceIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                      <MaterialCommunityIcons name={svc.icon} size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={s.serviceLabel}>{t(svc.labelKey)}</Text>
                  </View>
                ))}
              </View>

              {/* Phone hidden inside collapsible */}
              <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.md }}>
                <TouchableOpacity
                  style={s.phoneRow}
                  activeOpacity={0.7}
                  onPress={handleCallPhone}
                >
                  <View style={[s.phoneIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                    <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                    <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary }]}>
                      {t('categoryService.callUs')}
                    </Text>
                    <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                      04952 / 5304
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    heroSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    heroIcon: {
      width: 64,
      height: 64,
      marginBottom: theme.spacing.md,
    },
    heroTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    heroDescription: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    section: {
      marginTop: theme.spacing.lg,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    servicesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.sm,
    },
    serviceCard: {
      width: '50%',
      padding: theme.spacing.sm,
      alignItems: 'center',
    },
    serviceIconContainer: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    serviceLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'center',
    },
    ticketCta: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    ticketCtaText: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
      lineHeight: 22,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    phoneIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // AI Chat Banner
    aiChatBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryLight || theme.colors.primary + '10',
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '25',
    },
    aiChatBannerIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    aiChatBannerContent: {
      flex: 1,
    },
    aiChatBannerTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: 2,
    },
    aiChatBannerSubtitle: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  });
