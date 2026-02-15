import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useAboutContent } from '../../../hooks/useAboutContent';
import Card from '../../../components/ui/Card';
import Divider from '../../../components/ui/Divider';
import EditableTextBlock from '../../../components/about/EditableTextBlock';
import EditableListEditor from '../../../components/about/EditableListEditor';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_CERTIFIED_CATEGORIES = [
  'Rasenm\u00e4her',
  'Rasentraktoren / Aufsitzm\u00e4her',
  'Motorsensen / Freischneider',
  'Motors\u00e4gen',
  'Kehrmaschinen',
];

const DEFAULT_BENEFITS = [
  { icon: 'account-check', title: 'Qualifizierte Beratung' },
  { icon: 'school', title: 'Geschultes Personal' },
  { icon: 'clipboard-check', title: 'Regelm\u00e4\u00dfige Audits' },
  { icon: 'shield-check', title: 'Verbraucherschutz' },
];

const DEFAULT_TITLE = 'Wir sind QMF-zertifizierter Fachh\u00e4ndler!';
const DEFAULT_DESC1 = 'QMF ist eine Branchen-Qualifizierungsinitiative f\u00fcr den servicegebenden Fachhandel, initiiert von dessen Verb\u00e4nden BuFa-MOT und VdM und unterst\u00fctzt vom Gro\u00dfteil der fachhandelsorientierten Lieferanten.';
const DEFAULT_DESC2 = 'Ziel ist es, die Verbraucherberatung auf Basis festgelegter Kriterien zu optimieren und den Verbraucherschutz und die Sicherheit durch qualifizierte Produktschulungen zu gew\u00e4hrleisten.';
const DEFAULT_DESC3 = 'Mitglieder verpflichten sich, Qualit\u00e4tsstandards einzuhalten und regelm\u00e4\u00dfige Audits zu durchlaufen. Sie erhalten das Siegel: QMF\u00ae - Qualifizierter Motorger\u00e4te-Fachhandel.';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function CertifiedItem({ label, theme }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
      }}
    >
      <MaterialCommunityIcons
        name="check-circle"
        size={20}
        color={theme.colors.success}
        style={{ marginRight: theme.spacing.sm }}
      />
      <Text
        style={[
          theme.typography.styles.body,
          { color: theme.colors.text, flex: 1 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function BenefitCard({ icon, title, theme }) {
  return (
    <Card
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.sm,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.colors.surfaceVariant,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.sm,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={theme.colors.primary}
        />
      </View>
      <Text
        style={[
          theme.typography.styles.bodySmall,
          {
            color: theme.colors.text,
            fontWeight: theme.typography.weights.semiBold,
            textAlign: 'center',
          },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function QMFTab({ isEditMode, registerSave }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { content, saving, updateContent, saveAllChanges } = useAboutContent('qmf');

  // Register save function for parent to call on "Fertig"
  useEffect(() => {
    if (registerSave) registerSave(saveAllChanges);
  }, [registerSave, saveAllChanges]);
  const s = styles(theme);

  // Resolve content with fallbacks
  const title = content.title || DEFAULT_TITLE;
  const description1 = content.description1 || DEFAULT_DESC1;
  const description2 = content.description2 || DEFAULT_DESC2;
  const description3 = content.description3 || DEFAULT_DESC3;
  const certifiedCategories = useMemo(
    () => content.certifiedCategories || DEFAULT_CERTIFIED_CATEGORIES,
    [content.certifiedCategories]
  );
  const benefits = useMemo(
    () => content.benefits || DEFAULT_BENEFITS,
    [content.benefits]
  );

  // Save helpers
  const handleSaveTitle = useCallback(
    (val) => updateContent('title', val),
    [updateContent]
  );
  const handleSaveDesc1 = useCallback(
    (val) => updateContent('description1', val),
    [updateContent]
  );
  const handleSaveDesc2 = useCallback(
    (val) => updateContent('description2', val),
    [updateContent]
  );
  const handleSaveDesc3 = useCallback(
    (val) => updateContent('description3', val),
    [updateContent]
  );
  const handleSaveCertified = useCallback(
    (items) => updateContent('certifiedCategories', items),
    [updateContent]
  );
  const handleSaveBenefits = useCallback(
    (items) => updateContent('benefits', items),
    [updateContent]
  );

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
    >
      {/* Saving indicator */}
      {saving && (
        <View style={s.savingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={s.savingText}>Speichern...</Text>
        </View>
      )}

      {/* Hero / Badge */}
      <View style={s.heroSection}>
        <Image
          source={require('../../../../assets/about/qmf-badge.jpg')}
          style={s.badgeImage}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <View style={s.section}>
        <EditableTextBlock
          value={title}
          onSave={handleSaveTitle}
          isEditMode={isEditMode}
          style={s.title}
          placeholder="Titel eingeben..."
        />
      </View>

      {/* Description */}
      <View style={s.section}>
        <Card>
          <EditableTextBlock
            value={description1}
            onSave={handleSaveDesc1}
            isEditMode={isEditMode}
            style={s.paragraph}
            multiline
            placeholder="Beschreibung 1..."
          />

          <EditableTextBlock
            value={description2}
            onSave={handleSaveDesc2}
            isEditMode={isEditMode}
            style={s.paragraph}
            multiline
            placeholder="Beschreibung 2..."
          />

          <EditableTextBlock
            value={description3}
            onSave={handleSaveDesc3}
            isEditMode={isEditMode}
            style={[s.paragraph, { marginBottom: 0 }]}
            multiline
            placeholder="Beschreibung 3..."
          />
        </Card>
      </View>

      <Divider style={{ marginHorizontal: theme.spacing.md }} />

      {/* Certified For */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {t('aboutUs.qmf.certifiedForTitle', 'Zertifiziert f\u00fcr')}
        </Text>
        <Card>
          {certifiedCategories.map((category, index) => (
            <React.Fragment key={index}>
              <CertifiedItem label={category} theme={theme} />
              {index < certifiedCategories.length - 1 && (
                <Divider style={{ marginVertical: 0 }} />
              )}
            </React.Fragment>
          ))}

          {/* Edit mode: list editor */}
          <EditableListEditor
            items={certifiedCategories}
            onSave={handleSaveCertified}
            isEditMode={isEditMode}
            itemType="string"
          />
        </Card>
      </View>

      <Divider style={{ marginHorizontal: theme.spacing.md }} />

      {/* What QMF means for you */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {t('aboutUs.qmf.benefitsTitle', 'Was QMF f\u00fcr Sie bedeutet')}
        </Text>
        <View style={s.benefitsGrid}>
          <View style={s.benefitsRow}>
            {benefits[0] && (
              <BenefitCard
                icon={benefits[0].icon}
                title={benefits[0].title}
                theme={theme}
              />
            )}
            <View style={{ width: theme.spacing.sm }} />
            {benefits[1] && (
              <BenefitCard
                icon={benefits[1].icon}
                title={benefits[1].title}
                theme={theme}
              />
            )}
          </View>
          <View style={{ height: theme.spacing.sm }} />
          <View style={s.benefitsRow}>
            {benefits[2] && (
              <BenefitCard
                icon={benefits[2].icon}
                title={benefits[2].title}
                theme={theme}
              />
            )}
            <View style={{ width: theme.spacing.sm }} />
            {benefits[3] && (
              <BenefitCard
                icon={benefits[3].icon}
                title={benefits[3].title}
                theme={theme}
              />
            )}
          </View>
        </View>

        {/* Edit mode: list editor for benefits */}
        <EditableListEditor
          items={benefits}
          onSave={handleSaveBenefits}
          isEditMode={isEditMode}
          itemType="object"
          objectFields={[
            { key: 'icon', placeholder: 'Icon (z.B. account-check)' },
            { key: 'title', placeholder: 'Titel' },
          ]}
        />
      </View>

      {/* QMF Logo at bottom */}
      <View style={s.logoSection}>
        <Image
          source={require('../../../../assets/about/qmf-logo.jpg')}
          style={s.logoImage}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    savingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    savingText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
      fontFamily: theme.typography.fontFamily,
      marginLeft: 8,
    },
    heroSection: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    badgeImage: {
      width: 200,
      height: 200,
      borderRadius: theme.borderRadius.lg,
    },
    section: {
      marginTop: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
    },
    title: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.weights.semiBold,
    },
    paragraph: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      lineHeight: 22,
      marginBottom: theme.spacing.md,
    },
    benefitsGrid: {
      marginTop: theme.spacing.xs,
    },
    benefitsRow: {
      flexDirection: 'row',
    },
    logoSection: {
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    logoImage: {
      width: 120,
      height: 60,
      borderRadius: theme.borderRadius.md,
    },
  });
