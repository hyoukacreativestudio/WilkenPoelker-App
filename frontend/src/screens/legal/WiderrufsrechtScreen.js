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

export default function WiderrufsrechtScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const s = styles(theme);

  const sections = [
    {
      key: 'period',
      title: t('legal.widerrufsrecht.section1Title'),
      content: t('legal.widerrufsrecht.section1Content'),
      defaultOpen: true,
    },
    {
      key: 'exercise',
      title: t('legal.widerrufsrecht.section2Title'),
      content: t('legal.widerrufsrecht.section2Content'),
    },
    {
      key: 'refund',
      title: t('legal.widerrufsrecht.section3Title'),
      content: t('legal.widerrufsrecht.section3Content'),
    },
    {
      key: 'shipping',
      title: t('legal.widerrufsrecht.section4Title'),
      content: t('legal.widerrufsrecht.section4Content'),
    },
    {
      key: 'exclusions',
      title: t('legal.widerrufsrecht.section5Title'),
      content: t('legal.widerrufsrecht.section5Content'),
    },
    {
      key: 'withdrawalForm',
      title: t('legal.widerrufsrecht.section6Title'),
      content: t('legal.widerrufsrecht.section6Content'),
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
            {t('legal.widerrufsrecht.title')}
          </Text>
          <Text style={s.subtitle}>
            {t('legal.widerrufsrecht.subtitle')}
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
  });
