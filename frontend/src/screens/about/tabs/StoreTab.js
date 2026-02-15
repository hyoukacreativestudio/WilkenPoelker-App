import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
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
import EditOverlay from '../../../components/about/EditOverlay';

// ---------------------------------------------------------------------------
// Local asset map for store photos
// ---------------------------------------------------------------------------
const STORE_IMAGE_MAP = {
  'laden2': require('../../../../assets/about/laden2.jpg'),
  'laden5': require('../../../../assets/about/laden5.jpg'),
  'bikes-area': require('../../../../assets/about/bikes-area.jpeg'),
  'stihl-area': require('../../../../assets/about/stihl-area.jpeg'),
  'laden7': require('../../../../assets/about/laden7.jpg'),
  'laden8': require('../../../../assets/about/laden8.jpg'),
};

// ---------------------------------------------------------------------------
// Default data (used when no DB content)
// ---------------------------------------------------------------------------
const DEFAULT_PHOTOS = [
  { id: '1', image: 'laden2', label: 'Verkaufsraum' },
  { id: '2', image: 'laden5', label: 'Ausstellung' },
  { id: '3', image: 'bikes-area', label: 'Fahrrad-Bereich' },
  { id: '4', image: 'stihl-area', label: 'STIHL-Bereich' },
  { id: '5', image: 'laden7', label: 'Showroom' },
  { id: '6', image: 'laden8', label: 'Produktwelt' },
];

const DEFAULT_CATEGORIES = [
  { key: 'ebikes', icon: 'bicycle', label: 'E-Bikes & Fahrr\u00e4der' },
  { key: 'motor', icon: 'engine', label: 'Motorger\u00e4te' },
  { key: 'lawn', icon: 'grass', label: 'Rasenpflege' },
  { key: 'cleaning', icon: 'spray-bottle', label: 'Reinigungstechnik' },
  { key: 'forestry', icon: 'tree', label: 'Forsttechnik' },
  { key: 'irrigation', icon: 'water-pump', label: 'Bew\u00e4sserung' },
];

const DEFAULT_SERVICES = [
  'Abholservice & Lieferung',
  'Gebrauchsfertige \u00dcbergabe',
  'Individuelle Beratung',
  'Ger\u00e4teeinweisung',
  'Wartung & Inspektion',
  'Reparaturservice',
  'Ersatzteillager',
  'Finanzierungsm\u00f6glichkeiten',
];

const DEFAULT_HIGHLIGHTS = [
  { icon: 'ruler-square', text: '\u00dcber 1.500 m\u00b2 Verkaufsfl\u00e4che' },
  { icon: 'map-marker-radius', text: '2.000 m\u00b2 Teststrecke im Au\u00dfenbereich' },
  { icon: 'tag-multiple', text: 'Umfangreiches Markensortiment' },
];

const DEFAULT_TAGLINE = 'Wer hier nicht findet, was er braucht, braucht nicht, was er sucht!';

const DEFAULT_CONTACT = {
  address: 'Langholter Stra\u00dfe 43, 26842 Ostrhauderfehn',
  phone: '04952 / 5304',
  email: 'info@wilkenpoelker.de',
};

// ---------------------------------------------------------------------------
// Winter season detection + opening hours
// ---------------------------------------------------------------------------
function isWinterSeason(date = new Date()) {
  const month = date.getMonth();
  const day = date.getDate();
  if (month >= 10) return true;
  if (month === 0) return true;
  if (month === 1 && day === 1) return true;
  return false;
}

function getOpeningHours() {
  const closeTime = isWinterSeason() ? '17:00' : '18:00';
  return [
    { day: 'Mo \u2013 Fr', hours: `08:00\u201313:00 | 14:00\u2013${closeTime}` },
    { day: 'Sa', hours: '09:00\u201313:00' },
    { day: 'So', hours: 'Geschlossen' },
  ];
}

// ---------------------------------------------------------------------------
// Sub-components (view mode)
// ---------------------------------------------------------------------------
function CategoryItem({ item, theme }) {
  return (
    <View style={{ width: '33.33%', alignItems: 'center', marginBottom: theme.spacing.md }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.xs,
        }}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={26}
          color={theme.colors.primary}
        />
      </View>
      <Text
        style={[
          theme.typography.styles.caption,
          {
            color: theme.colors.text,
            textAlign: 'center',
            fontWeight: theme.typography.weights.medium,
          },
        ]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </View>
  );
}

function ServiceItem({ label, theme }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs + 2,
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

function ContactRow({ icon, text, onPress, theme, isEditMode, onSave, placeholder }) {
  if (isEditMode) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing.sm,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.sm,
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={theme.colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <EditableTextBlock
            value={text}
            onSave={onSave}
            isEditMode={true}
            style={[
              theme.typography.styles.body,
              { color: theme.colors.primary },
            ]}
            placeholder={placeholder}
          />
        </View>
      </View>
    );
  }

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
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={theme.colors.primary}
        />
      </View>
      <Text
        style={[
          theme.typography.styles.body,
          { color: theme.colors.primary, flex: 1 },
        ]}
      >
        {text}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StoreTab({ isEditMode, registerSave }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const s = styles(theme);
  const { content, saving, updateContent, saveAllChanges, uploadImage } = useAboutContent('store');

  // Register save function for parent to call on "Fertig"
  useEffect(() => {
    if (registerSave) registerSave(saveAllChanges);
  }, [registerSave, saveAllChanges]);
  const OPENING_HOURS = useMemo(() => getOpeningHours(), []);
  const isWinter = useMemo(() => isWinterSeason(), []);

  // Resolve content with fallbacks
  const tagline = content.tagline || DEFAULT_TAGLINE;
  const highlights = useMemo(
    () => content.highlights || DEFAULT_HIGHLIGHTS,
    [content.highlights]
  );
  const photos = useMemo(
    () => content.photos || DEFAULT_PHOTOS,
    [content.photos]
  );
  const categories = useMemo(
    () => content.categories || DEFAULT_CATEGORIES,
    [content.categories]
  );
  const services = useMemo(
    () => content.services || DEFAULT_SERVICES,
    [content.services]
  );
  const contactInfo = useMemo(
    () => content.contact || DEFAULT_CONTACT,
    [content.contact]
  );

  // Save helpers
  const handleSaveTagline = useCallback(
    (text) => updateContent('tagline', text),
    [updateContent]
  );
  const handleSaveHighlights = useCallback(
    (items) => updateContent('highlights', items),
    [updateContent]
  );
  const handleSavePhotos = useCallback(
    (items) => updateContent('photos', items),
    [updateContent]
  );
  const handleSaveCategories = useCallback(
    (items) => updateContent('categories', items),
    [updateContent]
  );
  const handleSaveServices = useCallback(
    (items) => updateContent('services', items),
    [updateContent]
  );
  const handleSaveContact = useCallback(
    (field, value) => {
      const updated = { ...contactInfo, [field]: value };
      updateContent('contact', updated);
    },
    [contactInfo, updateContent]
  );

  const openMaps = () => {
    Linking.openURL('https://www.google.com/maps/search/?api=1&query=Langholter+Stra%C3%9Fe+43,+26842+Ostrhauderfehn');
  };

  const callPhone = () => {
    Linking.openURL('tel:049525304');
  };

  const sendEmail = () => {
    Linking.openURL('mailto:info@wilkenpoelker.de');
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Saving indicator */}
      {saving && (
        <View style={s.savingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={s.savingText}>Speichern...</Text>
        </View>
      )}

      {/* Tagline */}
      <Card style={s.taglineCard}>
        {isEditMode ? (
          <EditableTextBlock
            value={tagline}
            onSave={handleSaveTagline}
            isEditMode={isEditMode}
            style={s.taglineText}
            multiline
            placeholder="Slogan eingeben..."
          />
        ) : (
          <Text style={s.taglineText}>
            {'\u201E'}{tagline}{'\u201C'}
          </Text>
        )}
      </Card>

      {/* Store Highlights */}
      <Card style={s.section}>
        <Text style={s.sectionTitle}>
          {t('store.highlights.title', 'Unser Ladengesch\u00e4ft')}
        </Text>
        {highlights.map((item, index) => (
          <View key={index} style={s.highlightRow}>
            <MaterialCommunityIcons
              name={item.icon || 'star'}
              size={20}
              color={theme.colors.primary}
              style={s.highlightIcon}
            />
            <Text style={s.highlightText}>
              {item.text}
            </Text>
          </View>
        ))}

        {/* Edit mode: list editor for highlights */}
        <EditableListEditor
          items={highlights}
          onSave={handleSaveHighlights}
          isEditMode={isEditMode}
          itemType="object"
          objectFields={[
            { key: 'icon', placeholder: 'Icon (z.B. ruler-square)' },
            { key: 'text', placeholder: 'Beschreibung' },
          ]}
        />
      </Card>

      {/* Photo Gallery */}
      <Text style={s.galleryTitle}>
        {t('store.gallery.title', 'Impressionen')}
      </Text>
      <EditableImageGallery
        images={photos}
        onSave={handleSavePhotos}
        isEditMode={isEditMode}
        onUploadImage={uploadImage}
        imageMap={STORE_IMAGE_MAP}
      />

      {/* Product Categories */}
      <Card style={s.section}>
        <Text style={s.sectionTitle}>
          {t('store.categories.title', 'Unser Sortiment')}
        </Text>
        <View style={s.categoryGrid}>
          {categories.map((cat, index) => (
            <CategoryItem key={cat.key || index} item={cat} theme={theme} />
          ))}
        </View>

        {/* Edit mode: list editor for categories */}
        <EditableListEditor
          items={categories}
          onSave={handleSaveCategories}
          isEditMode={isEditMode}
          itemType="object"
          objectFields={[
            { key: 'icon', placeholder: 'Icon (z.B. bicycle)' },
            { key: 'label', placeholder: 'Kategoriename' },
          ]}
        />
      </Card>

      {/* Services */}
      <Card style={s.section}>
        <Text style={s.sectionTitle}>
          {t('store.services.title', 'Unsere Leistungen')}
        </Text>
        {services.map((service, index) => (
          <ServiceItem
            key={index}
            label={typeof service === 'string' ? service : service.labelDe || service.label || ''}
            theme={theme}
          />
        ))}

        {/* Edit mode: list editor for services */}
        <EditableListEditor
          items={services.map((s) => (typeof s === 'string' ? s : s.labelDe || s.label || ''))}
          onSave={handleSaveServices}
          isEditMode={isEditMode}
          itemType="string"
        />
      </Card>

      <Divider />

      {/* Contact */}
      <Card style={s.section}>
        <Text style={s.sectionTitle}>
          {t('store.contact.title', 'Kontakt & Anfahrt')}
        </Text>
        <ContactRow
          icon="map-marker"
          text={contactInfo.address}
          onPress={openMaps}
          theme={theme}
          isEditMode={isEditMode}
          onSave={(val) => handleSaveContact('address', val)}
          placeholder="Adresse"
        />
        <ContactRow
          icon="phone"
          text={contactInfo.phone}
          onPress={callPhone}
          theme={theme}
          isEditMode={isEditMode}
          onSave={(val) => handleSaveContact('phone', val)}
          placeholder="Telefonnummer"
        />
        <ContactRow
          icon="email-outline"
          text={contactInfo.email}
          onPress={sendEmail}
          theme={theme}
          isEditMode={isEditMode}
          onSave={(val) => handleSaveContact('email', val)}
          placeholder="E-Mail"
        />
      </Card>

      {/* Opening Hours (not editable - system-driven) */}
      <Card style={s.section}>
        <View style={s.hoursHeader}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={22}
            color={theme.colors.primary}
            style={{ marginRight: theme.spacing.sm }}
          />
          <Text style={s.sectionTitle}>
            {t('store.hours.title', '\u00d6ffnungszeiten')}
          </Text>
        </View>
        {OPENING_HOURS.map((entry, index) => {
          const isClosed = entry.hours === 'Geschlossen';
          return (
            <View key={index} style={s.hoursRow}>
              <Text
                style={[
                  theme.typography.styles.body,
                  {
                    color: theme.colors.text,
                    fontWeight: theme.typography.weights.medium,
                    width: 90,
                  },
                ]}
              >
                {entry.day}
              </Text>
              <Text
                style={[
                  theme.typography.styles.body,
                  {
                    color: isClosed ? theme.colors.error : theme.colors.textSecondary,
                    flex: 1,
                    fontWeight: isClosed
                      ? theme.typography.weights.medium
                      : theme.typography.weights.regular,
                  },
                ]}
              >
                {isClosed ? t('store.hours.closed', 'Geschlossen') : entry.hours}
              </Text>
            </View>
          );
        })}
        {isWinter && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
            <MaterialCommunityIcons name="snowflake" size={14} color={theme.colors.info || '#1976D2'} style={{ marginRight: 6 }} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, fontStyle: 'italic' }]}>
              {t('store.hours.winterNote', 'Winter\u00f6ffnungszeiten (01.11. \u2013 01.02.)')}
            </Text>
          </View>
        )}
      </Card>

      {/* Bottom spacer */}
      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
    },
    savingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    savingText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
      fontFamily: theme.typography.fontFamily,
      marginLeft: 8,
    },
    taglineCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
    },
    taglineText: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight(theme.typography.sizes.h5),
    },
    section: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    highlightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    highlightIcon: {
      marginRight: theme.spacing.sm,
    },
    highlightText: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    galleryTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    hoursHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
  });
