import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { customerNumberApi } from '../../api/customerNumber';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export default function CustomerNumberRequestScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState(user?.address?.street || '');
  const [zip, setZip] = useState(user?.address?.zip || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [checkingRequest, setCheckingRequest] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    checkExistingRequest();
  }, []);

  const checkExistingRequest = async () => {
    try {
      const result = await customerNumberApi.getMyRequest();
      const req = result.data?.data?.request;
      if (req) setExistingRequest(req);
    } catch {
      // No request yet
    } finally {
      setCheckingRequest(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!phone.trim()) errs.phone = t('errors.requiredField');
    if (!street.trim()) errs.street = t('errors.requiredField');
    if (!zip.trim()) errs.zip = t('errors.requiredField');
    if (!city.trim()) errs.city = t('errors.requiredField');
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await customerNumberApi.createRequest({
        phone: phone.trim(),
        address: {
          street: street.trim(),
          zip: zip.trim(),
          city: city.trim(),
          country: 'Deutschland',
        },
        isExistingCustomer,
        message: message.trim() || undefined,
      });
      showToast({ type: 'success', message: t('customerNumber.requestSent') });
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.somethingWentWrong');
      showToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  if (checkingRequest) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary }]}>
          {t('common.loading')}...
        </Text>
      </View>
    );
  }

  // Show existing request status
  if (existingRequest) {
    const statusColors = {
      pending: theme.colors.warning,
      approved: theme.colors.success,
      rejected: theme.colors.error,
    };
    const statusLabels = {
      pending: t('customerNumber.statusPending'),
      approved: t('customerNumber.statusApproved'),
      rejected: t('customerNumber.statusRejected'),
    };

    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <View style={[s.statusCard, { borderColor: statusColors[existingRequest.status] + '40' }]}>
            <MaterialCommunityIcons
              name={existingRequest.status === 'approved' ? 'check-circle' : existingRequest.status === 'rejected' ? 'close-circle' : 'clock-outline'}
              size={48}
              color={statusColors[existingRequest.status]}
            />
            <Text style={[theme.typography.styles.h4, { color: theme.colors.text, marginTop: theme.spacing.md, textAlign: 'center' }]}>
              {statusLabels[existingRequest.status]}
            </Text>
            {existingRequest.status === 'approved' && existingRequest.assignedCustomerNumber && (
              <View style={[s.numberBadge, { backgroundColor: theme.colors.success + '15' }]}>
                <Text style={[theme.typography.styles.h3, { color: theme.colors.success }]}>
                  {existingRequest.assignedCustomerNumber}
                </Text>
              </View>
            )}
            {existingRequest.status === 'pending' && (
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' }]}>
                {t('customerNumber.pendingInfo')}
              </Text>
            )}
            {existingRequest.status === 'rejected' && existingRequest.reviewNote && (
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' }]}>
                {existingRequest.reviewNote}
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Info banner */}
        <View style={s.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.primary} />
          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, flex: 1, marginLeft: theme.spacing.sm }]}>
            {t('customerNumber.infoText')}
          </Text>
        </View>

        {/* Existing customer toggle */}
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
              {t('customerNumber.existingCustomerQuestion')}
            </Text>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              {t('customerNumber.existingCustomerHint')}
            </Text>
          </View>
          <Switch
            value={isExistingCustomer}
            onValueChange={setIsExistingCustomer}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        {/* Phone */}
        <Input
          label={t('profile.phone')}
          value={phone}
          onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
          keyboardType="phone-pad"
          error={errors.phone}
          leftIcon="phone-outline"
        />

        {/* Address */}
        <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: '600', marginTop: theme.spacing.md }]}>
          {t('profile.address')}
        </Text>

        <Input
          label={t('profile.street')}
          value={street}
          onChangeText={(v) => { setStreet(v); if (errors.street) setErrors((p) => ({ ...p, street: undefined })); }}
          error={errors.street}
        />

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('profile.zip')}
              value={zip}
              onChangeText={(v) => { setZip(v); if (errors.zip) setErrors((p) => ({ ...p, zip: undefined })); }}
              keyboardType="numeric"
              error={errors.zip}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Input
              label={t('profile.city')}
              value={city}
              onChangeText={(v) => { setCity(v); if (errors.city) setErrors((p) => ({ ...p, city: undefined })); }}
              error={errors.city}
            />
          </View>
        </View>

        {/* Optional message */}
        <Input
          label={`${t('customerNumber.messageLabel')} (${t('common.optional')})`}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Button
          title={t('customerNumber.submitRequest')}
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          style={{ marginTop: theme.spacing.lg }}
        />
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
      gap: theme.spacing.sm,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.primary + '10',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    statusCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      borderWidth: 1,
      marginTop: theme.spacing.xl,
    },
    numberBadge: {
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
  });
