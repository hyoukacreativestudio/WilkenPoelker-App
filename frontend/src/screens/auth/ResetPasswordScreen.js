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
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PasswordStrength from '../../components/shared/PasswordStrength';
import { resetPassword } from '../../api/auth';
import { useToast } from '../../components/ui/Toast';

export default function ResetPasswordScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const token = route.params?.token;

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = async () => {
    if (!password || !passwordConfirm) return;
    if (password !== passwordConfirm) {
      showToast({ type: 'error', message: t('errors.passwordMismatch') });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      showToast({ type: 'success', message: t('auth.passwordChanged') });
      navigation.navigate('Login');
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.somethingWentWrong');
      showToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.content}>
        <Text style={s.title}>{t('auth.resetPassword')}</Text>

        <Input
          label={t('auth.newPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        <PasswordStrength password={password} />

        <Input
          label={t('auth.confirmPassword')}
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry={!showPassword}
        />

        <Button
          title={t('auth.resetPassword')}
          onPress={handleReset}
          loading={loading}
          disabled={!password || !passwordConfirm}
          fullWidth
          style={{ marginTop: theme.spacing.md }}
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
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
  });
