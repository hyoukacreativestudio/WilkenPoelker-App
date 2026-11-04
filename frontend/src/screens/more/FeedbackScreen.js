import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useScreenEdges } from '../../hooks/useScreenEdges';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../components/ui/Toast';
import apiClient from '../../api/client';

// "Mehr" -> "Feedback": free text, only the admin reads it in the PC program.
export default function FeedbackScreen({ navigation }) {
  const safeEdges = useScreenEdges();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = message.trim().length >= 3 && !sending;

  const send = async () => {
    setSending(true);
    try {
      await apiClient.post('/feedback', { message: message.trim() });
      showToast({ type: 'success', message: t('feedback.thanks') });
      navigation.goBack();
    } catch (e) {
      showToast({ type: 'error', message: t('feedback.error') });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={safeEdges} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md }} keyboardShouldPersistTaps="handled">
          <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>{t('feedback.intro')}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('feedback.placeholder')}
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={3000}
            textAlignVertical="top"
            accessibilityLabel={t('feedback.title')}
            style={[styles.input, {
              color: theme.colors.text,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.divider,
              borderRadius: theme.borderRadius.md,
              marginTop: theme.spacing.md,
            }]}
          />
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>{t('feedback.note')}</Text>
          <TouchableOpacity
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.md, opacity: canSend ? 1 : 0.5 }]}
          >
            {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('feedback.send')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 180, borderWidth: 1, padding: 12, fontSize: 16 },
  button: { height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
