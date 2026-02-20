import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import EditableFAQSection from '../../components/service/EditableFAQSection';
import OfflineBanner from '../../components/ui/OfflineBanner';
import Button from '../../components/ui/Button';
import FloatingActionButton from '../../components/shared/FloatingActionButton';
import AiChatWidget from '../../components/service/AiChatWidget';

export default function ServiceHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [contactOpen, setContactOpen] = useState(false);

  const staffRoles = ['super_admin', 'admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager'];
  const isStaff = user && staffRoles.includes(user.role);

  const handleCreateTicket = useCallback(() => {
    navigation.navigate('CreateTicket');
  }, [navigation]);

  const handleOpenFullChat = useCallback((category) => {
    navigation.navigate('ServiceAiChat', { category: category || 'bike' });
  }, [navigation]);

  const handleCallPhone = () => {
    Linking.openURL('tel:+4949525304');
  };

  const handleSendEmail = () => {
    Linking.openURL('mailto:info@wilkenpoelker.de');
  };

  const handleOpenMaps = () => {
    const address = encodeURIComponent('Wilken Poelker GmbH, Langholter Straße 43, 26842 Ostrhauderfehn');
    Linking.openURL(`https://maps.google.com/?q=${address}`);
  };

  const openingHours = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const isWinter = month >= 10 || month === 0 || (month === 1 && day === 1);
    const closeTime = isWinter ? '17:00' : '18:00';
    return [
      { day: t('common.days.monday'), hours: `08:00 - 13:00 | 14:00 - ${closeTime}` },
      { day: t('common.days.tuesday'), hours: `08:00 - 13:00 | 14:00 - ${closeTime}` },
      { day: t('common.days.wednesday'), hours: `08:00 - 13:00 | 14:00 - ${closeTime}` },
      { day: t('common.days.thursday'), hours: `08:00 - 13:00 | 14:00 - ${closeTime}` },
      { day: t('common.days.friday'), hours: `08:00 - 13:00 | 14:00 - ${closeTime}` },
      { day: t('common.days.saturday'), hours: '09:00 - 13:00' },
    ];
  }, [t]);

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('service.title')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isStaff && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ServiceAdmin')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: theme.spacing.md }}
            >
              <MaterialCommunityIcons name="shield-account" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('ActiveChats')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: theme.spacing.md }}
          >
            <MaterialCommunityIcons name="chat-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI Chat Section */}
        <View style={[s.section, { paddingHorizontal: theme.spacing.md }]}>
          <AiChatWidget
            category="bike"
            onOpenFullChat={handleOpenFullChat}
          />
        </View>

        {/* FAQ Section */}
        <EditableFAQSection category="service" title={t('service.faqTitle')} />

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

        {/* Opening Hours Section */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { paddingHorizontal: theme.spacing.md }]}>
            {t('service.openingHours')}
          </Text>
          <View style={s.card}>
            {openingHours.map((item, index) => (
              <View
                key={item.day}
                style={[
                  s.hoursRow,
                  index < openingHours.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.divider,
                  },
                ]}
              >
                <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1 }]}>
                  {item.day}
                </Text>
                <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary }]}>
                  {item.hours}
                </Text>
              </View>
            ))}
            <View style={s.hoursRow}>
              <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1 }]}>
                {t('common.days.sunday')}
              </Text>
              <Text style={[theme.typography.styles.body, { color: theme.colors.error }]}>
                {t('service.closed')}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section (collapsible) */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.contactHeader}
            activeOpacity={0.7}
            onPress={() => setContactOpen((prev) => !prev)}
          >
            <Text style={[s.sectionTitle, { paddingHorizontal: 0 }]}>
              {t('service.contact')}
            </Text>
            <MaterialCommunityIcons
              name={contactOpen ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {contactOpen && (
            <View style={s.card}>
              {/* Phone */}
              <TouchableOpacity onPress={handleCallPhone} style={s.contactRow} activeOpacity={0.7}>
                <View style={[s.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary }]}>
                    {t('service.phone')}
                  </Text>
                  <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                    04952 / 5304
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>

              <View style={[s.contactDivider, { borderBottomColor: theme.colors.divider }]} />

              {/* Email */}
              <TouchableOpacity onPress={handleSendEmail} style={s.contactRow} activeOpacity={0.7}>
                <View style={[s.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary }]}>
                    {t('service.email')}
                  </Text>
                  <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                    info@wilkenpoelker.de
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>

              <View style={[s.contactDivider, { borderBottomColor: theme.colors.divider }]} />

              {/* Address */}
              <TouchableOpacity onPress={handleOpenMaps} style={s.contactRow} activeOpacity={0.7}>
                <View style={[s.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary }]}>
                    {t('service.address')}
                  </Text>
                  <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                    Langholter Str. 43, 26842 Ostrhauderfehn
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <FloatingActionButton
        onPress={handleCreateTicket}
      />
    </SafeAreaView>
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
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    section: {
      marginTop: theme.spacing.lg,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
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
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    contactIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      marginLeft: 72,
    },
  });
