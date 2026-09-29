import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import AccordionSection from '../../components/shared/AccordionSection';

export default function DatenschutzScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const s = styles(theme);

  // Sections come from i18n (legal.datenschutz.section<N>Title/Content), so the
  // policy text can grow without touching this screen.
  const sections = [];
  for (let i = 1; i <= 30 && i18n.exists(`legal.datenschutz.section${i}Title`); i += 1) {
    sections.push({
      key: `section${i}`,
      title: t(`legal.datenschutz.section${i}Title`),
      content: t(`legal.datenschutz.section${i}Content`),
      defaultOpen: i === 1,
    });
  }

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
