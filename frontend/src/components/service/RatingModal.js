import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function RatingModal({ visible, onSubmit, onSkip, loading }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating < 1) return;
    onSubmit(rating, comment.trim() || undefined);
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onSkip();
  };

  const s = styles(theme);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <MaterialCommunityIcons name="star-circle" size={40} color={theme.colors.warning} />
            <Text style={s.title}>{t('rating.title')}</Text>
            <Text style={s.subtitle}>{t('rating.subtitle')}</Text>
          </View>

          {/* Stars */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <MaterialCommunityIcons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? theme.colors.warning : theme.colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating label */}
          {rating > 0 && (
            <Text style={s.ratingLabel}>
              {t(`rating.label${rating}`)}
            </Text>
          )}

          {/* Comment */}
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder={t('rating.commentPlaceholder')}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            maxLength={2000}
          />

          {/* Actions */}
          <View style={s.actions}>
            <Button
              title={t('rating.submit')}
              onPress={handleSubmit}
              disabled={rating < 1 || loading}
              loading={loading}
              fullWidth
            />
            <TouchableOpacity onPress={handleClose} style={s.skipButton} activeOpacity={0.7}>
              <Text style={s.skipText}>{t('rating.skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 400,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginTop: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    ratingLabel: {
      ...theme.typography.styles.body,
      color: theme.colors.warning,
      fontWeight: theme.typography.weights.semiBold,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    actions: {
      marginTop: theme.spacing.lg,
    },
    skipButton: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    skipText: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
    },
  });
