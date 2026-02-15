import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';

// Platform-safe alert that works on web too
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // Confirmation dialog with Yes/No
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
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { appointmentsApi } from '../../api/appointments';
import { formatDate, formatTime } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';

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

const ADMIN_ROLES = ['admin', 'super_admin', 'service_manager', 'robby_manager'];

export default function AppointmentDetailScreen({ route, navigation }) {
  const { appointmentId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { showToast } = useToast();
  const appointmentApi = useApi(appointmentsApi.getAppointment);
  const cancelApi = useApi(appointmentsApi.cancel);
  const respondApi = useApi(appointmentsApi.respondToProposal);

  const [declineMessage, setDeclineMessage] = useState('');
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [showAcceptInput, setShowAcceptInput] = useState(false);
  const [customerNote, setCustomerNote] = useState('');

  // Staff question & registration states
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionSending, setQuestionSending] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerSending, setAnswerSending] = useState(false);

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  // Reload when returning from other screens (e.g. ProposeTime)
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadAppointment();
    }, [])
  );

  const loadAppointment = async () => {
    try {
      await appointmentApi.execute(appointmentId);
    } catch (err) {
      // Error handled by useApi
    }
  };

  const appointment = appointmentApi.data?.data || appointmentApi.data;

  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  const getStatusConfig = useCallback((status) => {
    switch (status) {
      case 'confirmed':
        return { color: theme.colors.success, icon: 'check-circle', label: t('appointments.statusConfirmed') };
      case 'pending':
        return { color: theme.colors.warning, icon: 'clock-outline', label: t('appointments.statusPending') };
      case 'proposed':
        return { color: '#3182CE', icon: 'calendar-question', label: t('appointments.statusProposed') };
      case 'cancelled':
        return { color: theme.colors.error, icon: 'close-circle', label: t('appointments.statusCancelled') };
      case 'completed':
        return { color: theme.colors.textSecondary, icon: 'check-all', label: t('appointments.statusCompleted') };
      case 'rescheduled':
        return { color: theme.colors.textSecondary, icon: 'calendar-refresh', label: t('appointments.statusRescheduled') };
      default:
        return { color: theme.colors.textSecondary, icon: 'help-circle', label: status };
    }
  }, [theme, t]);

  const handleCancel = useCallback(() => {
    showAlert(
      t('appointments.cancelAppointment'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelApi.execute(appointmentId, t('appointments.cancelAppointment'));
              showToast({ type: 'success', message: t('appointments.statusCancelled') });
              navigation.goBack();
            } catch (err) {
              showToast({ type: 'error', message: t('errors.somethingWentWrong') });
            }
          },
        },
      ]
    );
  }, [appointmentId, cancelApi, navigation, t]);

  const handleProposeTime = useCallback(() => {
    navigation.navigate('ProposeTime', {
      appointmentId,
      appointmentTitle: appointment?.title,
      appointmentType: appointment?.type,
      customer: appointment?.customer || null,
    });
  }, [appointmentId, appointment, navigation]);

  const handleAcceptProposal = useCallback(() => {
    const doAccept = async () => {
      try {
        await respondApi.execute(appointmentId, {
          accept: true,
          message: customerNote.trim() || undefined,
        });
        showToast({ type: 'success', message: t('appointments.proposalAccepted') });
        setShowAcceptInput(false);
        setCustomerNote('');
        loadAppointment();
      } catch (err) {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      }
    };

    showAlert(
      t('appointments.acceptProposal'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doAccept },
      ]
    );
  }, [appointmentId, customerNote, respondApi, t]);

  const handleDeclineProposal = useCallback(() => {
    const doDecline = async () => {
      try {
        await respondApi.execute(appointmentId, {
          accept: false,
          message: declineMessage.trim() || undefined,
        });
        showToast({ type: 'success', message: t('appointments.proposalDeclined') });
        setShowDeclineInput(false);
        setDeclineMessage('');
        loadAppointment();
      } catch (err) {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      }
    };

    showAlert(
      t('appointments.requestOtherDate'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doDecline },
      ]
    );
  }, [appointmentId, declineMessage, respondApi, t]);

  // Staff: Ask follow-up question
  const handleAskQuestion = useCallback(() => {
    if (!questionText.trim()) return;

    const doAsk = async () => {
      try {
        setQuestionSending(true);
        await appointmentsApi.askQuestion(appointmentId, questionText.trim());
        showToast({ type: 'success', message: t('appointments.questionSent') });
        setShowQuestionInput(false);
        setQuestionText('');
        loadAppointment();
      } catch {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      } finally {
        setQuestionSending(false);
      }
    };

    showAlert(
      t('appointments.askQuestion'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doAsk },
      ]
    );
  }, [appointmentId, questionText, t, showToast]);

  // Staff: Mark as registered
  const handleRegister = useCallback(async () => {
    const doRegister = async () => {
      try {
        setRegistering(true);
        await appointmentsApi.registerAppointment(appointmentId);
        showToast({ type: 'success', message: t('appointments.registeredSuccess') });
        loadAppointment();
      } catch {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      } finally {
        setRegistering(false);
      }
    };

    showAlert(
      t('appointments.markRegistered'),
      t('appointments.confirmRegister'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doRegister },
      ]
    );
  }, [appointmentId, t, showToast]);

  // Customer: Answer staff question
  const handleAnswerQuestion = useCallback(() => {
    if (!answerText.trim()) return;

    const doAnswer = async () => {
      try {
        setAnswerSending(true);
        await appointmentsApi.answerQuestion(appointmentId, answerText.trim());
        showToast({ type: 'success', message: t('appointments.answerSent') });
        setShowAnswerInput(false);
        setAnswerText('');
        loadAppointment();
      } catch {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      } finally {
        setAnswerSending(false);
      }
    };

    showAlert(
      t('appointments.answerQuestion'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doAnswer },
      ]
    );
  }, [appointmentId, answerText, t, showToast]);

  const isLoading = appointmentApi.loading;
  const s = styles(theme);

  if (isLoading && !appointment) {
    return (
      <View style={s.container}>
        <View style={s.skeletonWrap}>
          <View style={s.skeletonCard}>
            <SkeletonLoader width={250} height={24} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.md }} />
            <SkeletonLoader width={180} height={32} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
            <SkeletonLoader width={120} height={16} borderRadius={theme.borderRadius.sm} />
          </View>
          <View style={s.skeletonCard}>
            <SkeletonLoader width={'100%'} height={80} borderRadius={theme.borderRadius.md} />
          </View>
        </View>
      </View>
    );
  }

  if (appointmentApi.error && !appointment) {
    return (
      <View style={[s.container, s.centerContent]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={s.errorText}>
          {t('errors.somethingWentWrong')}
        </Text>
        <Button
          title={t('common.retry')}
          onPress={loadAppointment}
          variant="primary"
          style={{ marginTop: theme.spacing.md }}
        />
      </View>
    );
  }

  if (!appointment) return null;

  const statusConfig = getStatusConfig(appointment.status);
  const typeColor = TYPE_COLORS[appointment.type] || TYPE_COLORS.other;
  const isCancellable = appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.status !== 'rescheduled';
  const hasDate = appointment.date && (appointment.startTime || appointment.proposedText);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View style={s.headerCard}>
        {/* Type + Status Badges */}
        <View style={s.badgeRow}>
          <View style={[s.typeBadge, { backgroundColor: typeColor + '18' }]}>
            <View style={[s.badgeDot, { backgroundColor: typeColor }]} />
            <Text style={[s.badgeText, { color: typeColor }]}>
              {t(`appointments.type${appointment.type ? appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase()) : 'Service'}`, appointment.type)}
            </Text>
          </View>

          <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '18' }]}>
            <MaterialCommunityIcons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[s.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>{appointment.title}</Text>

        {/* Patience note for pending appointments */}
        {appointment.status === 'pending' && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.info + '10', borderRadius: 8, padding: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.info} style={{ marginTop: 2 }} />
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm, flex: 1, lineHeight: 20 }]}>
              {t('appointments.patienceNote')}
            </Text>
          </View>
        )}

        {/* Date and Time or Awaiting Proposal */}
        {hasDate ? (
          <View style={s.dateTimeSection}>
            <View style={s.dateTimeRow}>
              <View style={s.dateIconWrap}>
                <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.primary} />
              </View>
              <Text style={s.dateText}>{formatDate(appointment.date)}</Text>
            </View>
            {appointment.proposedText ? (
              <View style={s.dateTimeRow}>
                <View style={s.dateIconWrap}>
                  <MaterialCommunityIcons name="text-box-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={s.timeText}>{appointment.proposedText}</Text>
              </View>
            ) : appointment.startTime ? (
              <View style={s.dateTimeRow}>
                <View style={s.dateIconWrap}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={s.timeText}>
                  {formatTime(appointment.startTime)}
                  {appointment.endTime ? ` – ${formatTime(appointment.endTime)}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.awaitingBox}>
            <MaterialCommunityIcons name="clock-alert-outline" size={20} color={theme.colors.warning} />
            <Text style={s.awaitingText}>{t('appointments.awaitingProposal')}</Text>
          </View>
        )}
      </View>

      {/* Description Card */}
      {appointment.description ? (
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="text-box-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.sectionTitle}>{t('common.description')}</Text>
          </View>
          <Text style={s.sectionBody}>{appointment.description}</Text>
        </View>
      ) : null}

      {/* Customer Note Card */}
      {appointment.customerNote ? (
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="note-text-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.sectionTitle}>{t('appointments.customerNote')}</Text>
          </View>
          <Text style={s.sectionBody}>{appointment.customerNote}</Text>
        </View>
      ) : null}

      {/* Customer info (for admins) */}
      {isAdmin && appointment.customer && (
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.sectionTitle}>{t('appointments.customerInfo')}</Text>
          </View>
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="account" size={16} color={theme.colors.textTertiary} />
            <Text style={s.infoText}>
              {appointment.customer.firstName} {appointment.customer.lastName}
            </Text>
          </View>
          {appointment.customer.customerNumber && (
            <View style={s.infoRow}>
              <MaterialCommunityIcons name="pound" size={16} color={theme.colors.textTertiary} />
              <Text style={[s.infoTextSmall, { color: theme.colors.primary, fontWeight: '600' }]}>Kundennr. {appointment.customer.customerNumber}</Text>
            </View>
          )}
          {appointment.customer.email && (
            <View style={s.infoRow}>
              <MaterialCommunityIcons name="email-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={s.infoTextSmall}>{appointment.customer.email}</Text>
            </View>
          )}
          {appointment.customer.phone && (
            <View style={s.infoRow}>
              <MaterialCommunityIcons name="phone-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={s.infoTextSmall}>{appointment.customer.phone}</Text>
            </View>
          )}
          {appointment.customer.address && (() => {
            const addr = typeof appointment.customer.address === 'string' ? JSON.parse(appointment.customer.address) : appointment.customer.address;
            const parts = [addr.street, addr.zip && addr.city ? `${addr.zip} ${addr.city}` : addr.city || addr.zip].filter(Boolean);
            return parts.length > 0 ? (
              <View style={s.infoRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.textTertiary} />
                <Text style={s.infoTextSmall}>{parts.join(', ')}</Text>
              </View>
            ) : null;
          })()}
        </View>
      )}

      {/* Location Card */}
      {appointment.location ? (
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.sectionTitle}>{t('appointments.location')}</Text>
          </View>
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="store" size={16} color={theme.colors.textTertiary} />
            <Text style={[s.infoText, { fontWeight: theme.typography.weights.semiBold }]}>
              {typeof appointment.location === 'object' ? appointment.location.name : appointment.location}
            </Text>
          </View>
          {typeof appointment.location === 'object' && appointment.location.address && (
            <View style={s.infoRow}>
              <MaterialCommunityIcons name="map-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={s.infoTextSmall}>{appointment.location.address}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Admin: Propose Time Button (when pending) */}
      {isAdmin && appointment.status === 'pending' && (
        <View style={s.actionCard}>
          <Text style={s.actionHint}>
            {t('appointments.awaitingProposal')}
          </Text>
          <Button
            title={t('appointments.proposeTime')}
            onPress={handleProposeTime}
            variant="primary"
            fullWidth
            icon={
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#FFFFFF" />
            }
          />
        </View>
      )}

      {/* Customer: Accept/Decline when proposed */}
      {!isAdmin && appointment.status === 'proposed' && (
        <View style={s.actionCard}>
          <View style={s.proposalInfo}>
            <MaterialCommunityIcons name="calendar-question" size={20} color="#3182CE" />
            <Text style={s.proposalInfoText}>
              {t('appointments.proposalReceived')}
            </Text>
          </View>

          {!showAcceptInput ? (
            <Button
              title={t('appointments.acceptProposal')}
              onPress={() => setShowAcceptInput(true)}
              variant="primary"
              fullWidth
              icon={
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              }
              style={{ marginBottom: theme.spacing.sm }}
            />
          ) : (
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text style={s.customerNoteHint}>{t('appointments.customerNoteHint')}</Text>
              <TextInput
                value={customerNote}
                onChangeText={setCustomerNote}
                placeholder={t('appointments.customerNotePlaceholder')}
                placeholderTextColor={theme.colors.placeholder}
                style={s.declineInput}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Button
                title={t('appointments.confirmAccept')}
                onPress={handleAcceptProposal}
                variant="primary"
                fullWidth
                loading={respondApi.loading}
                icon={
                  <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                }
              />
            </View>
          )}

          {!showDeclineInput ? (
            <Button
              title={t('appointments.requestOtherDate')}
              onPress={() => setShowDeclineInput(true)}
              variant="secondary"
              fullWidth
              icon={
                <MaterialCommunityIcons name="calendar-refresh" size={20} color={theme.colors.primary} />
              }
            />
          ) : (
            <View>
              <TextInput
                value={declineMessage}
                onChangeText={setDeclineMessage}
                placeholder={t('appointments.declineMessagePlaceholder')}
                placeholderTextColor={theme.colors.placeholder}
                style={s.declineInput}
                multiline
                textAlignVertical="top"
                maxLength={200}
              />
              <Button
                title={t('appointments.sendDecline')}
                onPress={handleDeclineProposal}
                variant="danger"
                fullWidth
                loading={respondApi.loading}
              />
            </View>
          )}
        </View>
      )}

      {/* Staff: Registration status / Mark as registered */}
      {isAdmin && appointment.status === 'confirmed' && (
        <View style={s.sectionCard}>
          {appointment.registeredBy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <MaterialCommunityIcons name="calendar-check" size={20} color={theme.colors.success} />
              <Text style={[s.sectionBody, { color: theme.colors.success, fontWeight: theme.typography.weights.semiBold }]}>
                {t('appointments.registeredBy', {
                  name: appointment.registrant
                    ? `${appointment.registrant.firstName} ${appointment.registrant.lastName}`
                    : '-',
                  date: appointment.registeredAt
                    ? new Date(appointment.registeredAt).toLocaleDateString('de-DE')
                    : '-',
                })}
              </Text>
            </View>
          ) : (
            <Button
              title={t('appointments.markRegistered')}
              onPress={handleRegister}
              variant="primary"
              fullWidth
              loading={registering}
              icon={<MaterialCommunityIcons name="calendar-check" size={20} color="#FFFFFF" />}
            />
          )}
        </View>
      )}

      {/* Staff follow-up question section */}
      {isAdmin && appointment.staffQuestion && (
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="comment-question-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.sectionTitle}>{t('appointments.staffQuestion')}</Text>
          </View>
          <Text style={s.sectionBody}>{appointment.staffQuestion}</Text>
          {appointment.questioner && (
            <Text style={[s.infoTextSmall, { marginTop: theme.spacing.xs, fontStyle: 'italic' }]}>
              – {appointment.questioner.firstName} {appointment.questioner.lastName}
            </Text>
          )}
          {appointment.customerNote ? (
            <View style={[s.answerBox, { backgroundColor: theme.colors.success + '12', marginTop: theme.spacing.sm }]}>
              <MaterialCommunityIcons name="reply" size={16} color={theme.colors.success} />
              <Text style={[s.sectionBody, { flex: 1 }]}>{appointment.customerNote}</Text>
            </View>
          ) : (
            <View style={[s.answerBox, { backgroundColor: theme.colors.warning + '12', marginTop: theme.spacing.sm }]}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.warning} />
              <Text style={{ color: theme.colors.warning, fontSize: 13, fontWeight: '600' }}>
                {t('appointments.awaitingAnswer')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Staff: Ask question button */}
      {isAdmin && !appointment.staffQuestion && (
        <View style={s.actionCard}>
          {!showQuestionInput ? (
            <Button
              title={t('appointments.askQuestion')}
              onPress={() => setShowQuestionInput(true)}
              variant="secondary"
              fullWidth
              icon={<MaterialCommunityIcons name="comment-question-outline" size={20} color={theme.colors.primary} />}
            />
          ) : (
            <View>
              <TextInput
                value={questionText}
                onChangeText={setQuestionText}
                placeholder={t('appointments.questionPlaceholder')}
                placeholderTextColor={theme.colors.placeholder}
                style={s.declineInput}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => { setShowQuestionInput(false); setQuestionText(''); }}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('appointments.askQuestion')}
                  onPress={handleAskQuestion}
                  variant="primary"
                  loading={questionSending}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Customer: View staff question and answer */}
      {!isAdmin && appointment.staffQuestion && (
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="comment-question-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={s.sectionTitle}>{t('appointments.staffQuestion')}</Text>
          </View>
          <Text style={s.sectionBody}>{appointment.staffQuestion}</Text>
          {appointment.questioner && (
            <Text style={[s.infoTextSmall, { marginTop: theme.spacing.xs, fontStyle: 'italic' }]}>
              – {appointment.questioner.firstName} {appointment.questioner.lastName}
            </Text>
          )}
          {appointment.customerNote ? (
            <View style={[s.answerBox, { backgroundColor: theme.colors.success + '12', marginTop: theme.spacing.sm }]}>
              <MaterialCommunityIcons name="reply" size={16} color={theme.colors.success} />
              <Text style={[s.sectionBody, { flex: 1 }]}>{appointment.customerNote}</Text>
            </View>
          ) : !showAnswerInput ? (
            <Button
              title={t('appointments.answerQuestion')}
              onPress={() => setShowAnswerInput(true)}
              variant="primary"
              fullWidth
              icon={<MaterialCommunityIcons name="reply" size={20} color="#FFFFFF" />}
              style={{ marginTop: theme.spacing.sm }}
            />
          ) : (
            <View style={{ marginTop: theme.spacing.sm }}>
              <TextInput
                value={answerText}
                onChangeText={setAnswerText}
                placeholder={t('appointments.answerPlaceholder')}
                placeholderTextColor={theme.colors.placeholder}
                style={s.declineInput}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => { setShowAnswerInput(false); setAnswerText(''); }}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('appointments.answerQuestion')}
                  onPress={handleAnswerQuestion}
                  variant="primary"
                  loading={answerSending}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Cancel Action */}
      {isCancellable && appointment.status !== 'proposed' ? (
        <Button
          title={t('appointments.cancelAppointment')}
          onPress={handleCancel}
          variant="danger"
          fullWidth
          loading={cancelApi.loading}
          icon={
            <MaterialCommunityIcons name="calendar-remove" size={20} color="#FFFFFF" />
          }
          style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }}
        />
      ) : null}
    </ScrollView>
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
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    errorText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    skeletonWrap: {
      padding: theme.spacing.md,
    },
    skeletonCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    // Header card
    headerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      gap: 5,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      gap: 4,
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: theme.typography.weights.semiBold,
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.md,
    },
    dateTimeSection: {
      gap: theme.spacing.sm,
    },
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    dateIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
    },
    timeText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
    },
    awaitingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warning + '15',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm + 2,
      gap: theme.spacing.sm,
    },
    awaitingText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.warning,
      fontWeight: theme.typography.weights.semiBold,
      flex: 1,
    },
    // Section cards
    sectionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    sectionTitle: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionBody: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    infoText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      flex: 1,
    },
    infoTextSmall: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    // Action cards
    actionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    actionHint: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    proposalInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3182CE' + '12',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm + 2,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    proposalInfoText: {
      ...theme.typography.styles.bodySmall,
      color: '#3182CE',
      fontWeight: theme.typography.weights.semiBold,
      flex: 1,
    },
    declineInput: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      minHeight: 60,
    },
    customerNoteHint: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textTertiary,
      marginBottom: theme.spacing.xs,
    },
    answerBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm + 2,
    },
  });
