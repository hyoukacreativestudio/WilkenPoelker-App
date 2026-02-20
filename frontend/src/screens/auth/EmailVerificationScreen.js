import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/ui/Button';
import client from '../../api/client';

export default function EmailVerificationScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const email = route.params?.email || '';
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await client.post('/auth/resend-verification', { email });
      Alert.alert(
        t('emailVerification.resent', 'E-Mail gesendet'),
        t('emailVerification.resentMessage', 'Eine neue Verifizierungs-E-Mail wurde gesendet.')
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('emailVerification.resendError', 'E-Mail konnte nicht gesendet werden.')
      );
    } finally {
      setResending(false);
    }
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <View style={s.iconContainer}>
          <MaterialCommunityIcons name="email-check-outline" size={80} color={theme.colors.primary} />
        </View>
        <Text style={s.title}>
          {t('emailVerification.title', 'E-Mail verifizieren')}
        </Text>
        <Text style={s.message}>
          {t('emailVerification.message', 'Wir haben dir eine Verifizierungs-E-Mail gesendet. Bitte überprüfe dein Postfach und klicke auf den Link.')}
        </Text>
        {email ? (
          <Text style={s.email}>{email}</Text>
        ) : null}
        <View style={s.buttonContainer}>
          <Button
            title={t('emailVerification.resend', 'Erneut senden')}
            onPress={handleResend}
            variant="outline"
            loading={resending}
            style={{ marginBottom: theme.spacing.md }}
          />
          <Button
            title={t('emailVerification.backToLogin', 'Zurück zum Login')}
            onPress={() => navigation.navigate('Login')}
            variant="primary"
          />
        </View>
      </View>
    </SafeAreaView>
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    message: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.md,
    },
    email: {
      ...theme.typography.styles.body,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
      marginBottom: theme.spacing.xl,
    },
    buttonContainer: {
      width: '100%',
      marginTop: theme.spacing.lg,
    },
  });
