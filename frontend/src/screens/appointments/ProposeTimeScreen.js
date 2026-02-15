import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useApi } from '../../hooks/useApi';
import { appointmentsApi } from '../../api/appointments';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

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

const TYPE_COLORS = {
  repair: '#E53E3E',
  consultation: '#3182CE',
  pickup: '#38A169',
  service: '#D69E2E',
  inspection: '#805AD5',
  delivery: '#DD6B20',
  property_viewing: '#38A169',
  other: '#718096',
};

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function ProposeTimeScreen({ route, navigation }) {
  const { appointmentId, appointmentTitle, appointmentType, customer } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const typeColor = TYPE_COLORS[appointmentType] || TYPE_COLORS.other;

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [proposedText, setProposedText] = useState('');

  const { showToast } = useToast();
  const proposeApi = useApi(appointmentsApi.proposeTime);

  const formatDateDisplay = (d) =>
    d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const formatDateISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  // Web handler
  const handleWebDateChange = (e) => {
    const val = e.target.value;
    if (val) {
      const [y, m, d] = val.split('-').map(Number);
      const newDate = new Date(y, m - 1, d, date.getHours(), date.getMinutes());
      setDate(newDate);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!proposedText.trim()) {
      showToast({ type: 'error', message: t('appointments.proposedTextRequired') });
      return;
    }

    const doSubmit = async () => {
      const payload = {
        date: formatDateISO(date),
        proposedText: proposedText.trim(),
      };

      try {
        await proposeApi.execute(appointmentId, payload);
        showToast({ type: 'success', message: t('appointments.proposeSuccess') });
        navigation.goBack();
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || t('errors.somethingWentWrong');
        showToast({ type: 'error', message });
      }
    };

    showAlert(
      t('appointments.sendProposal'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doSubmit },
      ]
    );
  }, [date, proposedText, appointmentId, proposeApi, navigation, t, showToast]);

  // Build customer address string
  const getAddressString = () => {
    if (!customer?.address) return null;
    const addr = typeof customer.address === 'string' ? JSON.parse(customer.address) : customer.address;
    const parts = [addr.street, addr.zip && addr.city ? `${addr.zip} ${addr.city}` : addr.city || addr.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const s = styles(theme);
  const minDate = new Date();
  const isWeb = Platform.OS === 'web';

  const renderDatePicker = () => {
    if (isWeb) {
      return (
        <input
          type="date"
          value={formatDateISO(date)}
          min={formatDateISO(minDate)}
          onChange={handleWebDateChange}
          style={webInputStyle(theme)}
        />
      );
    }

    return (
      <>
        <TouchableOpacity
          style={s.pickerButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <View style={s.pickerIconWrap}>
            <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.primary} />
          </View>
          <Text style={s.pickerButtonText}>{formatDateDisplay(date)}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
        {showDatePicker && DateTimePicker && (
          <View style={s.pickerContainer}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={minDate}
              locale="de-DE"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.pickerDone} onPress={() => setShowDatePicker(false)}>
                <Text style={[s.pickerDoneText, { color: theme.colors.primary }]}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </>
    );
  };

  const customerAddress = getAddressString();

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
        {/* Appointment Info Card */}
        <View style={s.appointmentInfo}>
          <View style={[s.appointmentIconWrap, { backgroundColor: typeColor + '15' }]}>
            <MaterialCommunityIcons name="calendar-clock" size={22} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.appointmentInfoLabel}>{t('appointments.proposeTimeFor')}</Text>
            <Text style={s.appointmentInfoTitle}>{appointmentTitle || t('appointments.title')}</Text>
          </View>
        </View>

        {/* Customer Info Card */}
        {customer && (
          <View style={s.customerCard}>
            <View style={s.customerHeader}>
              <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={s.customerHeaderText}>{t('appointments.customerInfo')}</Text>
            </View>

            {/* Name + Kundennummer */}
            <View style={s.customerRow}>
              <View style={s.customerAvatarWrap}>
                <Text style={s.customerInitials}>
                  {(customer.firstName?.[0] || '') + (customer.lastName?.[0] || '')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.customerName}>
                  {customer.firstName} {customer.lastName}
                </Text>
                {customer.customerNumber && (
                  <Text style={s.customerNumber}>
                    Kundennr. {customer.customerNumber}
                  </Text>
                )}
              </View>
            </View>

            {/* Contact + Address details */}
            <View style={s.customerDetails}>
              {customer.email && (
                <View style={s.customerDetailRow}>
                  <MaterialCommunityIcons name="email-outline" size={15} color={theme.colors.textTertiary} />
                  <Text style={s.customerDetailText}>{customer.email}</Text>
                </View>
              )}
              {customer.phone && (
                <View style={s.customerDetailRow}>
                  <MaterialCommunityIcons name="phone-outline" size={15} color={theme.colors.textTertiary} />
                  <Text style={s.customerDetailText}>{customer.phone}</Text>
                </View>
              )}
              {customerAddress && (
                <View style={s.customerDetailRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color={theme.colors.textTertiary} />
                  <Text style={s.customerDetailText}>{customerAddress}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Date Section */}
        <Text style={s.sectionLabel}>{t('appointments.dateLabel')}</Text>
        {renderDatePicker()}

        {/* Proposed Text (Free Text) */}
        <Text style={s.sectionLabel}>{t('appointments.proposedTextLabel')}</Text>
        <TextInput
          value={proposedText}
          onChangeText={setProposedText}
          placeholder={t('appointments.proposedTextPlaceholder')}
          placeholderTextColor={theme.colors.placeholder}
          style={s.proposedTextInput}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        {/* Submit */}
        <Button
          title={t('appointments.sendProposal')}
          onPress={handleSubmit}
          variant="primary"
          fullWidth
          loading={proposeApi.loading}
          disabled={!proposedText.trim()}
          icon={
            <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
          }
          style={{ marginTop: theme.spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const webInputStyle = (theme) => ({
  backgroundColor: theme.colors.inputBackground,
  color: theme.colors.text,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
});

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
    // Appointment info card
    appointmentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
      ...theme.shadows.md,
    },
    appointmentIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appointmentInfoLabel: {
      ...theme.typography.styles.caption,
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    appointmentInfoTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginTop: 2,
    },
    // Customer card
    customerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    customerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    customerHeaderText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    customerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    customerAvatarWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    customerInitials: {
      ...theme.typography.styles.body,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.bold,
    },
    customerName: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    customerNumber: {
      ...theme.typography.styles.caption,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
      marginTop: 1,
    },
    customerDetails: {
      gap: theme.spacing.xs + 2,
    },
    customerDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    customerDetailText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    // Pickers & Input
    sectionLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.semiBold,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 4,
      ...theme.shadows.sm,
    },
    pickerIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    pickerButtonText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      flex: 1,
    },
    pickerContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      marginTop: theme.spacing.xs,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    pickerDone: {
      alignItems: 'flex-end',
      padding: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerDoneText: {
      ...theme.typography.styles.body,
      fontWeight: theme.typography.weights.semiBold,
    },
    proposedTextInput: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      minHeight: 100,
      ...theme.shadows.sm,
    },
  });
