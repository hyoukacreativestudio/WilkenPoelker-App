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

export default function DatenschutzScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const s = styles(theme);

  const sections = [
    {
      key: 'controller',
      title: t('legal.datenschutz.section1Title'),
      content: t('legal.datenschutz.section1Content'),
      defaultOpen: true,
    },
    {
      key: 'collection',
      title: t('legal.datenschutz.section2Title'),
      content: t('legal.datenschutz.section2Content'),
    },
    {
      key: 'cookies',
      title: t('legal.datenschutz.section3Title'),
      content: t('legal.datenschutz.section3Content'),
    },
    {
      key: 'marketing',
      title: t('legal.datenschutz.section4Title'),
      content: t('legal.datenschutz.section4Content'),
    },
    {
      key: 'rights',
      title: t('legal.datenschutz.section5Title'),
      content: t('legal.datenschutz.section5Content'),
    },
    {
      key: 'authority',
      title: t('legal.datenschutz.section6Title'),
      content: t('legal.datenschutz.section6Content'),
    },
    {
      key: 'services',
      title: t('legal.datenschutz.section7Title'),
      content: t('legal.datenschutz.section7Content'),
    },
    {
      key: 'retention',
      title: t('legal.datenschutz.section8Title'),
      content: t('legal.datenschutz.section8Content'),
    },
    {
      key: 'contact',
      title: t('legal.datenschutz.section9Title'),
      content: t('legal.datenschutz.section9Content'),
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
            {t('legal.datenschutz.title')}
          </Text>
          <Text style={s.subtitle}>
            {t('legal.datenschutz.subtitle')}
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
            {t('legal.datenschutz.lastUpdated')}
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
    noticeSection: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    noticeBanner: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    accordionContainer: {
      paddingHorizontal: theme.spacing.md,
    },
    sectionText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      lineHeight: 22,
    },
    footerSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
    },
  });
