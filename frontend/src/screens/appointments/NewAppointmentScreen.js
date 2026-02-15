import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

// Platform-safe alert that works on web too
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const yesBtn = buttons.find(b => b.style === 'destructive' || b.text?.toLowerCase() === 'ja');
        if (yesBtn?.onPress) yesBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      const btn = buttons?.find(b => b.onPress);
      if (btn) btn.onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useApi } from '../../hooks/useApi';
import { appointmentsApi } from '../../api/appointments';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const CATEGORIES = [
  { key: 'delivery', icon: 'truck-delivery-outline', color: '#DD6B20' },
  { key: 'inspection', icon: 'clipboard-check-outline', color: '#805AD5' },
  { key: 'repair', icon: 'wrench-outline', color: '#E53E3E' },
  { key: 'property_viewing', icon: 'home-search-outline', color: '#38A169' },
  { key: 'other', icon: 'dots-horizontal-circle-outline', color: '#718096' },
];

export default function NewAppointmentScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { showToast } = useToast();
  const createApi = useApi(appointmentsApi.createAppointment);

  const getCategoryTranslation = (key) => {
    const transKey = `appointments.type${key.charAt(0).toUpperCase() + key.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
    return t(transKey, key);
  };

  const handleCategorySelect = (key) => {
    setSelectedCategory(key);
    if (key !== 'other') {
      setTitle(getCategoryTranslation(key));
    } else {
      setTitle('');
    }
  };

  const handleSubmit = useCallback(() => {
    if (!selectedCategory) {
      showToast({ type: 'error', message: t('appointments.selectCategory') });
      return;
    }
    if (!title.trim()) {
      showToast({ type: 'error', message: t('appointments.titleRequired') });
      return;
    }

    const doSubmit = async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: selectedCategory,
      };

      try {
        await createApi.execute(payload);
        showToast({ type: 'success', message: t('appointments.createSuccess') });
        navigation.goBack();
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || t('errors.somethingWentWrong');
        showToast({ type: 'error', message });
      }
    };

    showAlert(
      t('appointments.newAppointment'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doSubmit },
      ]
    );
  }, [selectedCategory, title, description, createApi, navigation, t, showToast]);

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card - like a PostCard */}
        <View style={s.infoCard}>
          <View style={s.infoIconWrap}>
            <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={s.infoText}>
            {t('appointments.requestInfo')}
          </Text>
        </View>

        {/* Category Selection */}
        <Text style={s.sectionLabel}>{t('appointments.selectCategory')}</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  s.categoryCard,
                  isSelected && {
                    borderColor: cat.color,
                    borderWidth: 2,
                    backgroundColor: cat.color + '12',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleCategorySelect(cat.key)}
              >
                <View
                  style={[
                    s.categoryIconWrap,
                    { backgroundColor: cat.color + '18' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={26}
                    color={cat.color}
                  />
                </View>
                <Text
                  style={[
                    s.categoryLabel,
                    { color: isSelected ? cat.color : theme.colors.text },
                  ]}
                  numberOfLines={2}
                >
                  {getCategoryTranslation(cat.key)}
                </Text>
                {isSelected && (
                  <View style={[s.checkBadge, { backgroundColor: cat.color }]}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title + Description + Submit (only after category selection) */}
        {selectedCategory && (
          <View style={s.formSection}>
            <Text style={s.sectionLabel}>{t('appointments.appointmentTitle')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={
                selectedCategory === 'other'
                  ? t('appointments.otherTitlePlaceholder')
                  : t('appointments.titlePlaceholder')
              }
              placeholderTextColor={theme.colors.placeholder}
              style={[
                s.textInput,
                selectedCategory !== 'other' && s.textInputReadonly,
              ]}
              maxLength={100}
              editable={selectedCategory === 'other'}
            />

            <Text style={s.sectionLabel}>{t('appointments.descriptionLabel')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('appointments.descriptionPlaceholder')}
              placeholderTextColor={theme.colors.placeholder}
              style={[s.textInput, s.textArea]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <Button
              title={t('appointments.submitAppointment')}
              onPress={handleSubmit}
              variant="primary"
              fullWidth
              loading={createApi.loading}
              disabled={!title.trim() || !selectedCategory}
              icon={
                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              }
              style={{ marginTop: theme.spacing.lg }}
            />

            {/* Patience note */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.info + '10', borderRadius: 8, padding: theme.spacing.md, marginTop: theme.spacing.md }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.info} style={{ marginTop: 2 }} />
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm, flex: 1, lineHeight: 20 }]}>
                {t('appointments.patienceNote')}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.shadows.md,
    },
    infoIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    sectionLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.semiBold,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    categoryCard: {
      width: '47.5%',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 110,
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    categoryIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    categoryLabel: {
      ...theme.typography.styles.bodySmall,
      fontWeight: theme.typography.weights.semiBold,
      textAlign: 'center',
    },
    checkBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formSection: {
      marginTop: theme.spacing.sm,
    },
    textInput: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    textInputReadonly: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.textSecondary,
    },
    textArea: {
      minHeight: 100,
      paddingTop: theme.spacing.sm + 2,
    },
  });
