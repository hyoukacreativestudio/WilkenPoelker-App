import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PasswordStrength from '../../components/shared/PasswordStrength';
import { useToast } from '../../components/ui/Toast';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    street: '',
    zip: '',
    city: '',
  });
  const [dsgvo, setDsgvo] = useState(false);
  const [agb, setAgb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = t('errors.requiredField');
    if (!form.lastName.trim()) errs.lastName = t('errors.requiredField');
    if (!form.username.trim()) errs.username = t('errors.requiredField');
    if (!form.email.trim()) errs.email = t('errors.requiredField');
    if (!form.password) errs.password = t('errors.requiredField');
    if (form.password !== form.passwordConfirm) errs.passwordConfirm = t('errors.passwordMismatch');
    if (!dsgvo) errs.dsgvo = t('errors.requiredField');
    if (!agb) errs.agb = t('errors.requiredField');
    return errs;
  };

  const handleRegister = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const address = {};
      if (form.street.trim()) address.street = form.street.trim();
      if (form.zip.trim()) address.zip = form.zip.trim();
      if (form.city.trim()) address.city = form.city.trim();
      address.country = 'Deutschland';

      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        address: Object.keys(address).length > 1 ? address : undefined,
        dsgvoAccepted: true,
        agbAccepted: true,
      });
      showToast({ type: 'success', message: t('auth.registrationSuccess') });
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
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>{t('auth.register')}</Text>

        <View style={s.row}>
          <View style={s.halfField}>
            <Input
              label={t('profile.firstName')}
              value={form.firstName}
              onChangeText={(v) => updateField('firstName', v)}
              error={errors.firstName}
            />
          </View>
          <View style={s.halfField}>
            <Input
              label={t('profile.lastName')}
              value={form.lastName}
              onChangeText={(v) => updateField('lastName', v)}
              error={errors.lastName}
            />
          </View>
        </View>

        <Input
          label={t('auth.username')}
          value={form.username}
          onChangeText={(v) => updateField('username', v)}
          autoCapitalize="none"
          error={errors.username}
        />

        <Input
          label={t('auth.email')}
          value={form.email}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />

        <Input
          label={`${t('profile.phone')} (${t('common.optional')})`}
          value={form.phone}
          onChangeText={(v) => updateField('phone', v)}
          keyboardType="phone-pad"
        />

        <Input
          label={t('auth.password')}
          value={form.password}
          onChangeText={(v) => updateField('password', v)}
          secureTextEntry={!showPassword}
          error={errors.password}
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        <PasswordStrength password={form.password} />

        <Input
          label={t('auth.confirmPassword')}
          value={form.passwordConfirm}
          onChangeText={(v) => updateField('passwordConfirm', v)}
          secureTextEntry={!showPassword}
          error={errors.passwordConfirm}
        />

        {/* Address section */}
        <Text style={s.sectionTitle}>{`${t('profile.address')} (${t('common.optional')})`}</Text>

        <Input
          label={t('profile.street')}
          value={form.street}
          onChangeText={(v) => updateField('street', v)}
        />

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('profile.zip')}
              value={form.zip}
              onChangeText={(v) => updateField('zip', v)}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Input
              label={t('profile.city')}
              value={form.city}
              onChangeText={(v) => updateField('city', v)}
            />
          </View>
        </View>

        <View style={s.checkboxRow}>
          <Switch
            value={dsgvo}
            onValueChange={setDsgvo}
            trackColor={{ true: theme.colors.primary }}
          />
          <Text style={[s.checkboxLabel, errors.dsgvo && s.checkboxError]}>
            {t('auth.dsgvoAccept')}
          </Text>
        </View>

        <View style={s.checkboxRow}>
          <Switch
            value={agb}
            onValueChange={setAgb}
            trackColor={{ true: theme.colors.primary }}
          />
          <Text style={[s.checkboxLabel, errors.agb && s.checkboxError]}>
            {t('auth.agbAccept')}
          </Text>
        </View>

        <Button
          title={t('auth.register')}
          onPress={handleRegister}
          loading={loading}
          fullWidth
          style={{ marginTop: theme.spacing.md }}
        />

        <View style={s.footer}>
          <Text style={s.footerText}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.footerLink}>{t('auth.loginNow')}</Text>
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
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.xxl,
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.styles.h2,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.semiBold,
      marginTop: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    halfField: {
      flex: 1,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    checkboxLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.text,
      flex: 1,
    },
    checkboxError: {
      color: theme.colors.error,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
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
