import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useApi } from '../../hooks/useApi';
import { serviceApi } from '../../api/service';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';
import { getPreviewUri, revokePreviewUri, getDisplayUri } from '../../utils/imageHelpers';
import ImageEditModal from '../../components/shared/ImageEditModal';

const TITLE_OPTIONS = {
  bike: [
    { key: 'repair_request', labelKey: 'createTicket.titles.repairRequest' },
    { key: 'warranty', labelKey: 'createTicket.titles.warranty' },
    { key: 'spare_part', labelKey: 'createTicket.titles.sparePart' },
    { key: 'consultation', labelKey: 'createTicket.titles.consultation' },
    { key: 'other', labelKey: 'createTicket.titles.other' },
  ],
  cleaning: [
    { key: 'device_repair', labelKey: 'createTicket.titles.deviceRepair' },
    { key: 'maintenance', labelKey: 'createTicket.titles.maintenance' },
    { key: 'spare_part', labelKey: 'createTicket.titles.sparePart' },
    { key: 'consultation', labelKey: 'createTicket.titles.consultation' },
    { key: 'other', labelKey: 'createTicket.titles.other' },
  ],
  motor: [
    { key: 'repair', labelKey: 'createTicket.titles.repair' },
    { key: 'inspection', labelKey: 'createTicket.titles.inspection' },
    { key: 'spare_part', labelKey: 'createTicket.titles.sparePart' },
    { key: 'consultation', labelKey: 'createTicket.titles.consultation' },
    { key: 'other', labelKey: 'createTicket.titles.other' },
  ],
  service: [
    { key: 'general_question', labelKey: 'createTicket.titles.generalQuestion' },
    { key: 'complaint', labelKey: 'createTicket.titles.complaint' },
    { key: 'feedback', labelKey: 'createTicket.titles.feedback' },
    { key: 'other', labelKey: 'createTicket.titles.other' },
  ],
};

// Map title keys to ticket types for backend
const TITLE_TYPE_MAP = {
  repair_request: 'repair',
  warranty: 'other',
  spare_part: 'maintenance',
  consultation: 'consultation',
  device_repair: 'repair',
  maintenance: 'maintenance',
  repair: 'repair',
  inspection: 'inspection',
  general_question: 'other',
  complaint: 'other',
  feedback: 'other',
  other: 'other',
};

export default function CreateTicketScreen({ route, navigation }) {
  const { preselectedType, category: routeCategory } = route.params || {};
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const category = routeCategory || 'service';
  const titleOptions = useMemo(() => TITLE_OPTIONS[category] || TITLE_OPTIONS.service, [category]);

  const [selectedTitleKey, setSelectedTitleKey] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  const createTicketApi = useApi(serviceApi.createTicket);

  const isCustomTitle = selectedTitleKey === 'other';
  const resolvedTitle = isCustomTitle ? customTitle.trim() : (selectedTitleKey ? t(titleOptions.find((o) => o.key === selectedTitleKey)?.labelKey || '') : '');

  const validate = () => {
    const newErrors = {};
    if (!selectedTitleKey) {
      newErrors.title = t('createTicket.errors.titleRequired');
    }
    if (isCustomTitle && !customTitle.trim()) {
      newErrors.customTitle = t('createTicket.errors.customTitleRequired');
    }
    if (!description.trim()) {
      newErrors.description = t('errors.requiredField');
    } else if (description.trim().length < 10) {
      newErrors.description = t('service.errors.descriptionTooShort');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const formData = new FormData();
      formData.append('title', resolvedTitle);
      formData.append('type', TITLE_TYPE_MAP[selectedTitleKey] || 'other');
      formData.append('category', category);
      formData.append('description', description.trim());
      formData.append('urgency', 'normal');

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const fileName = image.fileName || `attachment_${i}.jpg`;
        if (Platform.OS === 'web') {
          const webFile = image.file || image._webFile;
          if (webFile) {
            formData.append('attachments', webFile, fileName);
          }
        } else {
          formData.append('attachments', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: fileName,
          });
        }
      }

      const result = await createTicketApi.execute(formData);
      showToast({ type: 'success', message: t('service.ticketCreatedSuccess') });
      const ticketData = result?.data?.ticket || result?.data || result;
      const ticketId = ticketData?._id || ticketData?.id;
      if (ticketId) {
        navigation.replace('TicketDetail', { ticketId });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('service.createTicketError');
      showToast({ type: 'error', message: msg });
    }
  };

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast({ type: 'error', message: t('permissions.mediaLibrary') });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - images.length,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          file: asset.file, // native File object on web from expo-image-picker
          type: asset.mimeType || asset.type || 'image/jpeg',
          fileName: asset.fileName || `attachment_${Date.now()}.jpg`,
          _previewUri: getPreviewUri(asset),
        }));
        setImages((prev) => [...prev, ...newImages].slice(0, 5));
      }
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?._previewUri) revokePreviewUri(removed._previewUri);
      return prev.filter((_, i) => i !== index);
    });
  };

  const s = styles(theme);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Title Selection */}
      <View style={s.fieldContainer}>
        <Text style={s.label}>{t('createTicket.selectTitle')}</Text>
        <View style={s.titleChipsContainer}>
          {titleOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                s.titleChip,
                selectedTitleKey === option.key && s.titleChipSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedTitleKey(option.key);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
            >
              <Text
                style={[
                  s.titleChipText,
                  selectedTitleKey === option.key && s.titleChipTextSelected,
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.title && <Text style={s.errorText}>{errors.title}</Text>}
      </View>

      {/* Custom Title Input (only when "Sonstiges" selected) */}
      {isCustomTitle && (
        <View style={s.fieldContainer}>
          <Input
            label={t('createTicket.customTitle')}
            value={customTitle}
            onChangeText={(text) => {
              setCustomTitle(text);
              if (errors.customTitle) setErrors((prev) => ({ ...prev, customTitle: undefined }));
            }}
            placeholder={t('createTicket.customTitlePlaceholder')}
            error={errors.customTitle}
            maxLength={200}
          />
        </View>
      )}

      {/* Description */}
      <View style={s.fieldContainer}>
        <Input
          label={t('createTicket.descriptionLabel')}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          placeholder={t('createTicket.descriptionPlaceholder')}
          multiline
          error={errors.description}
          style={{ minHeight: 140, textAlignVertical: 'top' }}
        />
      </View>

      {/* Image Attachments */}
      <View style={s.fieldContainer}>
        <Text style={s.label}>
          {t('service.attachments')} ({t('common.optional')})
        </Text>
        <View style={s.imagesRow}>
          {images.map((image, index) => (
            <View key={index} style={s.imageContainer}>
              <TouchableOpacity onPress={() => setEditingIndex(index)} activeOpacity={0.8}>
                <Image source={{ uri: getDisplayUri(image) }} style={s.imagePreview} />
                <View style={{ position: 'absolute', bottom: 2, left: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 2 }}>
                  <MaterialCommunityIcons name="pencil" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemoveImage(index)}
                style={s.removeImageButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={handleAddImage}
            style={s.addImageButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }]}>
              {t('service.addPhoto')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit Button */}
      <View style={s.submitContainer}>
        <Button
          title={t('service.submitTicket')}
          onPress={handleSubmit}
          loading={createTicketApi.loading}
          disabled={createTicketApi.loading}
          fullWidth
        />

        {/* Patience note */}
        <View style={s.infoNote}>
          <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.info} style={{ marginTop: 2 }} />
          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm, flex: 1, lineHeight: 20 }]}>
            {t('service.patienceNote')}
          </Text>
        </View>
      </View>

      {/* Image Edit Modal */}
      {editingIndex !== null && (
        <ImageEditModal
          visible={editingIndex !== null}
          image={images[editingIndex]}
          onSave={(editedImage) => {
            setImages((prev) => prev.map((img, i) => (i === editingIndex ? editedImage : img)));
            setEditingIndex(null);
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}
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
      paddingBottom: theme.spacing.xxl,
    },
    fieldContainer: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.semiBold,
      marginBottom: theme.spacing.sm,
    },
    titleChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    titleChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    titleChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight || theme.colors.primary + '15',
    },
    titleChipText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
    },
    titleChipTextSelected: {
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
    },
    errorText: {
      ...theme.typography.styles.caption,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    imagesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    imageContainer: {
      position: 'relative',
    },
    imagePreview: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.md,
    },
    removeImageButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.round,
    },
    addImageButton: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitContainer: {
      marginTop: theme.spacing.md,
    },
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.info + '10',
      borderRadius: 8,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
  });
