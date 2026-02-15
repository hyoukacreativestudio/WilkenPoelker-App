import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    setErrors({});
    if (!email.trim()) {
      setErrors({ email: t('errors.requiredField') });
      return;
    }
    if (!password) {
      setErrors({ password: t('errors.requiredField') });
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password, customerNumber: customerNumber.trim() || undefined });
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.invalidCredentials');
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
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={s.logoSection}>
          <Image
            source={require('../../../assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Image
            source={require('../../../assets/logo2.png')}
            style={s.slogan}
            resizeMode="contain"
          />
        </View>

        {/* Welcome Text */}
        <View style={s.welcomeSection}>
          <Text style={s.welcomeTitle}>{t('auth.loginWelcome', 'Willkommen zurück')}</Text>
          <Text style={s.welcomeSubtitle}>{t('auth.loginSubtitle', 'Melde dich an, um fortzufahren')}</Text>
        </View>

        {/* Form Card */}
        <View style={s.formCard}>
          <Input
            label={t('auth.emailOrLastName')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailOrLastName')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.password')}
            secureTextEntry={!showPassword}
            error={errors.password}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Input
            label={`${t('auth.customerNumber')} (${t('common.optional')})`}
            value={customerNumber}
            onChangeText={setCustomerNumber}
            placeholder={t('auth.customerNumber')}
            keyboardType="numeric"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={s.forgotPassword}
          >
            <Text style={s.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <Button
            title={t('auth.login')}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="large"
          />
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.footerLink}>{t('auth.registerNow')}</Text>
          </TouchableOpacity>
        </View>
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
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
      maxWidth: 440,
      width: '100%',
      alignSelf: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    logo: {
      height: 72,
      width: 300,
      marginBottom: theme.spacing.md,
    },
    slogan: {
      height: 36,
      width: 180,
      opacity: 0.8,
    },
    welcomeSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    welcomeTitle: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.xs,
    },
    welcomeSubtitle: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
    },
    formCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      ...theme.shadows.md,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: theme.spacing.md,
      marginTop: -theme.spacing.xs,
    },
    forgotPasswordText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    footerText: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
    },
    footerLink: {
      ...theme.typography.styles.body,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
    },
  });
