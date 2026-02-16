import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/ui/Card';
import Divider from '../../components/ui/Divider';

function ContactRow({ icon, label, value, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={theme.colors.primary}
        style={{ marginRight: theme.spacing.sm }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            theme.typography.styles.caption,
            { color: theme.colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            theme.typography.styles.body,
            { color: theme.colors.primary },
          ]}
        >
          {value}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="open-in-new"
        size={16}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

function InfoBlock({ label, value, theme }) {
  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <Text
        style={[
          theme.typography.styles.caption,
          {
            color: theme.colors.textTertiary,
            marginBottom: theme.spacing.xs,
            fontWeight: theme.typography.weights.medium,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          theme.typography.styles.body,
          { color: theme.colors.text, lineHeight: 22 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ImpressumScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handlePhone = () => {
    Linking.openURL('tel:049525304');
  };

  const handleFax = () => {
    Linking.openURL('tel:049525096');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:info@wilkenpoelker.de');
  };

  const handleWebsite = () => {
    Linking.openURL('https://www.wilkenpoelker.de');
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Company Information */}
        <View style={s.section}>
          <Card>
            <Text style={s.companyName}>
              {t('legal.impressum.companyName')}
            </Text>
            <Divider />

            <InfoBlock
              label={t('legal.impressum.addressLabel')}
              value={`${t('legal.impressum.street')}\n${t('legal.impressum.city')}\n${t('legal.impressum.country')}`}
              theme={theme}
            />

            <Divider />

            <InfoBlock
              label={t('legal.impressum.representedBy')}
              value={t('legal.impressum.representedByValue')}
              theme={theme}
            />

            <Divider />

            <InfoBlock
              label={t('legal.impressum.tradeRegister')}
              value={t('legal.impressum.tradeRegisterValue')}
              theme={theme}
            />

            <InfoBlock
              label={t('legal.impressum.vatId')}
              value={t('legal.impressum.vatIdValue')}
              theme={theme}
            />
          </Card>
        </View>

        {/* Contact Information */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.contactTitle')}</Text>
          <Card>
            <ContactRow
              icon="phone-outline"
              label={t('legal.impressum.phone')}
              value={t('legal.impressum.phoneValue')}
              onPress={handlePhone}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <ContactRow
              icon="fax"
              label={t('legal.impressum.fax')}
              value={t('legal.impressum.faxValue')}
              onPress={handleFax}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <ContactRow
              icon="email-outline"
              label={t('legal.impressum.email')}
              value={t('legal.impressum.emailValue')}
              onPress={handleEmail}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <ContactRow
              icon="web"
              label={t('legal.impressum.website')}
              value={t('legal.impressum.websiteValue')}
              onPress={handleWebsite}
              theme={theme}
            />
          </Card>
        </View>

        {/* Content Responsibility */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.contentResponsible')}</Text>
          <Card>
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, lineHeight: 22 }]}>
              {t('legal.impressum.contentResponsibleValue')}
            </Text>
          </Card>
        </View>

        {/* Supervisory Authority */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.supervisoryAuthority')}</Text>
          <Card>
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, lineHeight: 22 }]}>
              {t('legal.impressum.supervisoryAuthorityValue')}
            </Text>
          </Card>
        </View>

        {/* FairCommerce */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.fairCommerce')}</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={20}
                color={theme.colors.success}
                style={{ marginRight: theme.spacing.sm }}
              />
              <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                {t('legal.impressum.fairCommerceValue')}
              </Text>
            </View>
          </Card>
        </View>

        {/* Dispute Resolution */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.disputeResolutionTitle')}</Text>
          <Card>
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, lineHeight: 22 }]}>
              {t('legal.impressum.disputeResolutionText')}
            </Text>
          </Card>
        </View>

        {/* Disclaimer */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.disclaimerTitle')}</Text>
          <Card>
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, lineHeight: 20 }]}>
              {t('legal.impressum.disclaimerText')}
            </Text>
          </Card>
        </View>

        {/* App Development Credits */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('legal.impressum.appDevelopmentTitle')}</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <MaterialCommunityIcons
                name="code-braces"
                size={20}
                color={theme.colors.primary}
                style={{ marginRight: theme.spacing.sm }}
              />
              <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: '600' }]}>
                HyoukaCreativeStudio
              </Text>
            </View>
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, lineHeight: 20 }]}>
              {t('legal.impressum.appDevelopmentText')}
            </Text>
            <Divider style={{ marginVertical: theme.spacing.sm }} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, textAlign: 'center' }]}>
              {t('settings.copyright')}
            </Text>
          </Card>
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
    section: {
      marginTop: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.weights.semiBold,
    },
    companyName: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
  });
