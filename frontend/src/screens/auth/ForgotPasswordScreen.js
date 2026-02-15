import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  if (sent) {
    return (
      <View style={s.container}>
        <View style={s.successContent}>
          <MaterialCommunityIcons
            name="email-check"
            size={64}
            color={theme.colors.success}
          />
          <Text style={s.successTitle}>{t('auth.resetPassword')}</Text>
          <Text style={s.successMessage}>{t('auth.resetEmailSent')}</Text>
          <Button
            title={t('auth.loginNow')}
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={{ marginTop: theme.spacing.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.content}>
        <MaterialCommunityIcons
          name="lock-reset"
          size={64}
          color={theme.colors.primary}
        />
        <Text style={s.title}>{t('auth.forgotPassword')}</Text>
        <Text style={s.subtitle}>
          {t('auth.resetEmailSent')}
        </Text>

        <Input
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title={t('auth.resetPassword')}
          onPress={handleSubmit}
          loading={loading}
          disabled={!email.trim()}
          fullWidth
          style={{ marginTop: theme.spacing.md }}
        />

        <Button
          title={t('common.back')}
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
          style={{ marginTop: theme.spacing.sm }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      alignItems: 'center',
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    subtitle: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    successContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    successTitle: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    successMessage: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
