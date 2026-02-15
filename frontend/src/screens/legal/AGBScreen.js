import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import AccordionSection from '../../components/shared/AccordionSection';

export default function AGBScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const s = styles(theme);

  const sections = [
    {
      key: 'basics',
      title: t('legal.agb.section1Title'),
      content: t('legal.agb.section1Content'),
      defaultOpen: true,
    },
    {
      key: 'accessibility',
      title: t('legal.agb.section2Title'),
      content: t('legal.agb.section2Content'),
    },
    {
      key: 'contract-goods',
      title: t('legal.agb.section3Title'),
      content: t('legal.agb.section3Content'),
    },
    {
      key: 'contract-courses',
      title: t('legal.agb.section4Title'),
      content: t('legal.agb.section4Content'),
    },
    {
      key: 'substitute',
      title: t('legal.agb.section5Title'),
      content: t('legal.agb.section5Content'),
    },
    {
      key: 'assembly',
      title: t('legal.agb.section6Title'),
      content: t('legal.agb.section6Content'),
    },
    {
      key: 'repair',
      title: t('legal.agb.section7Title'),
      content: t('legal.agb.section7Content'),
    },
    {
      key: 'retention',
      title: t('legal.agb.section8Title'),
      content: t('legal.agb.section8Content'),
    },
    {
      key: 'warranty',
      title: t('legal.agb.section9Title'),
      content: t('legal.agb.section9Content'),
    },
    {
      key: 'parts-return',
      title: t('legal.agb.section10Title'),
      content: t('legal.agb.section10Content'),
    },
    {
      key: 'jurisdiction',
      title: t('legal.agb.section11Title'),
      content: t('legal.agb.section11Content'),
    },
    {
      key: 'customer-info',
      title: t('legal.agb.section12Title'),
      content: t('legal.agb.section12Content'),
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Title */}
        <View style={s.headerSection}>
          <Text style={s.title}>
            {t('legal.agb.title')}
          </Text>
          <Text style={s.subtitle}>
            {t('legal.agb.subtitle')}
          </Text>
        </View>

        {/* Accordion Sections */}
        <View style={s.accordionContainer}>
          {sections.map((section) => (
            <AccordionSection
              key={section.key}
              title={section.title}
              defaultOpen={section.defaultOpen || false}
              style={{ marginBottom: theme.spacing.sm }}
            >
              <Text style={s.sectionText}>
                {section.content}
              </Text>
            </AccordionSection>
          ))}
        </View>

        {/* Last Updated */}
        <View style={s.footerSection}>
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textTertiary, textAlign: 'center' },
            ]}
          >
            {t('legal.agb.lastUpdated')}
          </Text>
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
    headerSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    accordionContainer: {
      paddingHorizontal: theme.spacing.md,
    },
    sectionText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      lineHeight: 22,
    },
    disclaimerSection: {
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    disclaimerBanner: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    footerSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
    },
  });
