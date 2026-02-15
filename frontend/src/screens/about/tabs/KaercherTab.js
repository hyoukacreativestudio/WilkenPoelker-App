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
import EditableImageGallery from '../../../components/about/EditableImageGallery';
import EditableListEditor from '../../../components/about/EditableListEditor';

const KAERCHER_YELLOW = '#FFD500';

// ---------------------------------------------------------------------------
// Local asset map for gallery images
// ---------------------------------------------------------------------------
const KAERCHER_IMAGE_MAP = {
  'kaercher1': require('../../../../assets/about/kaercher1.jpeg'),
  'kaercher2': require('../../../../assets/about/kaercher2.jpeg'),
  'kaercher3': require('../../../../assets/about/kaercher3.jpeg'),
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_TITLE = 'Wir sind autorisierter K\u00e4rcher-H\u00e4ndler!';
const DEFAULT_DESCRIPTION = 'Wir vertreiben die gesamte Palette des weltweit in Qualit\u00e4t und Technologie f\u00fchrenden Anbieters von Reinigungssystemen und Reinigungsprodukten: K\u00c4RCHER.';

const DEFAULT_GALLERY = [
  { id: '1', image: 'kaercher1', label: '' },
  { id: '2', image: 'kaercher2', label: '' },
  { id: '3', image: 'kaercher3', label: '' },
];

const DEFAULT_CATEGORIES = [
  { icon: 'water', label: 'Hochdruckreiniger' },
  { icon: 'vacuum', label: 'Na\u00df-/Trockensauger' },
  { icon: 'broom', label: 'Kehrmaschinen' },
  { icon: 'iron-outline', label: 'Dampfb\u00fcgeleisen' },
  { icon: 'broom', label: 'Akkubesen' },
  { icon: 'spray', label: 'Terrassenreiniger' },
];

const DEFAULT_SERVICE_POINTS = [
  'Umfangreiches Ersatzteillager',
  'Geschultes Fachpersonal',
  'Hauseigene Reparatur & Wartung',
  'Vor-Ort-Service f\u00fcr Gewerbekunden',
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function KaercherTab({ isEditMode, registerSave }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { content, saving, updateContent, saveAllChanges, uploadImage } = useAboutContent('kaercher');

  // Register save function for parent to call on "Fertig"
  useEffect(() => {
    if (registerSave) registerSave(saveAllChanges);
  }, [registerSave, saveAllChanges]);
  const s = styles(theme);

  // Resolve content with fallbacks
  const title = content.title || DEFAULT_TITLE;
  const description = content.description || DEFAULT_DESCRIPTION;
  const gallery = useMemo(
    () => content.gallery || DEFAULT_GALLERY,
    [content.gallery]
  );
  const categories = useMemo(
    () => content.categories || DEFAULT_CATEGORIES,
    [content.categories]
  );
  const servicePoints = useMemo(
    () => content.servicePoints || DEFAULT_SERVICE_POINTS,
    [content.servicePoints]
  );

  // Save helpers
  const handleSaveTitle = useCallback(
    (val) => updateContent('title', val),
    [updateContent]
  );
  const handleSaveDescription = useCallback(
    (val) => updateContent('description', val),
    [updateContent]
  );
  const handleSaveGallery = useCallback(
    (items) => updateContent('gallery', items),
    [updateContent]
  );
  const handleSaveCategories = useCallback(
    (items) => updateContent('categories', items),
    [updateContent]
  );
  const handleSaveServicePoints = useCallback(
    (items) => updateContent('servicePoints', items),
    [updateContent]
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Saving indicator */}
      {saving && (
        <View style={s.savingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={s.savingText}>Speichern...</Text>
        </View>
      )}

      {/* Hero / Logo Section */}
      <Card style={s.logoCard}>
        <View style={s.logoContainer}>
          <Image
            source={require('../../../../assets/about/kaercher-logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>
      </Card>

      {/* Title & Description */}
      <Card style={s.sectionCard}>
        <EditableTextBlock
          value={title}
          onSave={handleSaveTitle}
          isEditMode={isEditMode}
          style={s.title}
          placeholder="Titel eingeben..."
        />
        <EditableTextBlock
          value={description}
          onSave={handleSaveDescription}
          isEditMode={isEditMode}
          style={s.description}
          multiline
          placeholder="Beschreibung eingeben..."
        />
      </Card>

      {/* Product Gallery */}
      <View style={s.gallerySection}>
        <Text style={s.gallerySectionTitle}>
          {t('aboutUs.kaercher.gallery', 'Produkt\u00fcbersicht')}
        </Text>
        <EditableImageGallery
          images={gallery}
          onSave={handleSaveGallery}
          isEditMode={isEditMode}
          onUploadImage={uploadImage}
          imageMap={KAERCHER_IMAGE_MAP}
        />
      </View>

      <Divider style={s.divider} />

      {/* Product Categories */}
      <Card style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={22}
            color={KAERCHER_YELLOW}
          />
          <Text style={s.sectionTitle}>
            {t('aboutUs.kaercher.categoriesTitle', 'Produktkategorien')}
          </Text>
        </View>
        <View style={s.categoriesList}>
          {categories.map((cat, index) => (
            <View key={index} style={s.categoryItem}>
              <View style={[s.categoryIconContainer, { backgroundColor: KAERCHER_YELLOW + '20' }]}>
                <MaterialCommunityIcons
                  name={cat.icon || 'tag'}
                  size={22}
                  color={KAERCHER_YELLOW}
                />
              </View>
              <Text style={s.categoryLabel}>
                {cat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Edit mode: list editor */}
        <EditableListEditor
          items={categories}
          onSave={handleSaveCategories}
          isEditMode={isEditMode}
          itemType="object"
          objectFields={[
            { key: 'icon', placeholder: 'Icon (z.B. water)' },
            { key: 'label', placeholder: 'Kategoriename' },
          ]}
        />
      </Card>

      <Divider style={s.divider} />

      {/* Our Service */}
      <Card style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <MaterialCommunityIcons
            name="wrench-outline"
            size={22}
            color={theme.colors.primary}
          />
          <Text style={s.sectionTitle}>
            {t('aboutUs.kaercher.serviceTitle', 'Unser Service')}
          </Text>
        </View>
        <View style={s.serviceList}>
          {servicePoints.map((point, index) => (
            <View key={index} style={s.serviceItem}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={theme.colors.success}
              />
              <Text style={s.serviceLabel}>
                {typeof point === 'string' ? point : point.fallback || point.label || ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Edit mode: list editor */}
        <EditableListEditor
          items={servicePoints.map((p) => (typeof p === 'string' ? p : p.fallback || p.label || ''))}
          onSave={handleSaveServicePoints}
          isEditMode={isEditMode}
          itemType="string"
        />
      </Card>

      {/* Bottom Logo */}
      <View style={s.bottomLogoContainer}>
        <Image
          source={require('../../../../assets/about/kaercher-logo-small.png')}
          style={s.bottomLogo}
          resizeMode="contain"
        />
      </View>

      <View style={s.bottomSpacer} />
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
    logoCard: {
      margin: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      alignItems: 'center',
      backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
      padding: theme.spacing.lg,
    },
    logoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 200,
      height: 80,
    },
    sectionCard: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    description: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    gallerySection: {
      marginBottom: theme.spacing.md,
    },
    gallerySectionTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    divider: {
      marginHorizontal: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
    },
    categoriesList: {
      gap: theme.spacing.sm,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.md,
    },
    categoryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryLabel: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
      flex: 1,
    },
    serviceList: {
      gap: theme.spacing.sm,
    },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    serviceLabel: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    bottomLogoContainer: {
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
    },
    bottomLogo: {
      width: 120,
      height: 48,
      opacity: 0.7,
    },
    bottomSpacer: {
      height: theme.spacing.xl,
    },
  });
