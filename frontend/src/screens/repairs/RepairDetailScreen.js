import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useApi } from '../../hooks/useApi';
import { repairsApi } from '../../api/repairs';
import { ratingsApi } from '../../api/ratings';
import { formatDate } from '../../utils/formatters';
import StatusTimeline from '../../components/repair/StatusTimeline';
import RatingStars from '../../components/shared/RatingStars';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';

const STATUS_COLORS = {
  in_repair: '#DD6B20',
  quote_created: '#805AD5',
  parts_ordered: '#D69E2E',
  repair_done: '#38A169',
  ready: '#38A169',
};

export default function RepairDetailScreen({ route, navigation }) {
  const { repairId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const repairApi = useApi(repairsApi.getRepair);
  const statusApi = useApi(repairsApi.getRepairStatus);
  const submitRatingApi = useApi(ratingsApi.createServiceRating);

  useEffect(() => {
    loadRepairData();
  }, [repairId]);

  const loadRepairData = async () => {
    try {
      await Promise.all([
        repairApi.execute(repairId),
        statusApi.execute(repairId),
      ]);
    } catch (err) {
      // Error handled by useApi
    }
  };

  const repair = repairApi.data?.data?.repair || repairApi.data?.repair || repairApi.data;
  const statusData = statusApi.data?.data || statusApi.data;

  const getStatusLabel = useCallback((status) => {
    const labels = {
      in_repair: t('repairs.statusInRepair'),
      quote_created: t('repairs.statusQuoteCreated'),
      parts_ordered: t('repairs.statusPartsOrdered'),
      repair_done: t('repairs.statusRepairDone'),
      ready: t('repairs.statusReady'),
    };
    return labels[status] || status;
  }, [t]);

  const handleDownloadInvoice = useCallback(async () => {
    if (repair?.invoiceUrl) {
      try {
        await Linking.openURL(repair.invoiceUrl);
      } catch (err) {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      }
    }
  }, [repair, t, showToast]);

  const handleSubmitRating = useCallback(async () => {
    if (rating === 0) return;

    try {
      await submitRatingApi.execute({
        repairId,
        rating,
        comment: ratingComment,
      });
      setRatingSubmitted(true);
      showToast({ type: 'success', message: t('repairs.rateService') });
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    }
  }, [rating, ratingComment, repairId, submitRatingApi, t, showToast]);

  const handleAcknowledge = useCallback(async () => {
    try {
      setAcknowledging(true);
      await repairsApi.acknowledgeRepair(repairId);
      setAcknowledged(true);
      showToast({ type: 'success', message: t('repairs.acknowledgeSuccess') });
    } catch {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    } finally {
      setAcknowledging(false);
    }
  }, [repairId, t, showToast]);

  const isLoading = repairApi.loading || statusApi.loading;

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.md }}>
      <SkeletonLoader width={150} height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
      <SkeletonLoader width={220} height={22} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.md }} />
      <SkeletonLoader width={90} height={26} borderRadius={theme.borderRadius.round} style={{ marginBottom: theme.spacing.lg }} />
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={{ flexDirection: 'row', marginBottom: theme.spacing.md }}>
          <SkeletonLoader width={16} height={16} borderRadius={theme.borderRadius.round} />
          <View style={{ marginLeft: theme.spacing.sm }}>
            <SkeletonLoader width={140} height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={100} height={10} borderRadius={theme.borderRadius.sm} />
          </View>
        </View>
      ))}
    </View>
  );

  if (isLoading && !repair) {
    return (
      <View style={[s(theme).container, { justifyContent: 'center', alignItems: 'center' }]}>
        {renderSkeletons()}
      </View>
    );
  }

  if (repairApi.error && !repair) {
    return (
      <View style={[s(theme).container, { justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={[theme.typography.styles.body, { color: theme.colors.text, marginTop: theme.spacing.md, textAlign: 'center' }]}>
          {t('errors.somethingWentWrong')}
        </Text>
        <Button
          title={t('common.retry')}
          onPress={loadRepairData}
          variant="primary"
          style={{ marginTop: theme.spacing.md }}
        />
      </View>
    );
  }

  if (!repair) return null;

  const statusColor = STATUS_COLORS[repair.status] || theme.colors.textSecondary;
  const canRate = repair.status === 'ready' && !repair.review && !ratingSubmitted;

  const styles = s(theme);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Repair Number */}
      <Text style={styles.repairNumber}>
        {t('repairs.repairNumber')} {repair.repairNumber || repair.number}
      </Text>

      {/* Device Name */}
      <Text style={styles.deviceName}>
        {repair.deviceName || repair.device}
      </Text>

      {/* Status Badge */}
      <View style={{ flexDirection: 'row', marginBottom: theme.spacing.lg }}>
        <View
          style={{
            backgroundColor: statusColor,
            borderRadius: theme.borderRadius.round,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <Text
            style={[
              theme.typography.styles.bodySmall,
              { color: '#FFFFFF', fontWeight: theme.typography.weights.semiBold },
            ]}
          >
            {getStatusLabel(repair.status)}
          </Text>
        </View>
      </View>

      {/* Acknowledge ready repair */}
      {repair.status === 'ready' && (
        <Card style={{ marginBottom: theme.spacing.lg, backgroundColor: theme.colors.success + '10', borderWidth: 1, borderColor: theme.colors.success + '30' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <MaterialCommunityIcons name="package-variant-closed-check" size={24} color={theme.colors.success} />
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, marginLeft: theme.spacing.sm, flex: 1 }]}>
              {t('repairs.readyForPickup')}
            </Text>
          </View>
          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginBottom: theme.spacing.md }]}>
            {t('repairs.readyForPickupDesc')}
          </Text>
          {acknowledged || repair.acknowledgedAt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm, backgroundColor: theme.colors.success + '20', borderRadius: theme.borderRadius.md }}>
              <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.success} />
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.success, fontWeight: theme.typography.weights.semiBold, marginLeft: theme.spacing.sm }]}>
                {t('repairs.acknowledged')}
              </Text>
            </View>
          ) : (
            <Button
              title={t('repairs.acknowledgePickup')}
              onPress={handleAcknowledge}
              loading={acknowledging}
              fullWidth
              variant="primary"
              icon={<MaterialCommunityIcons name="check-decagram" size={18} color="#FFFFFF" />}
            />
          )}
        </Card>
      )}

      {/* Status Timeline */}
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <Text style={styles.sectionTitle}>{t('common.status')}</Text>
        <StatusTimeline
          statusHistory={statusData?.history || repair.statusHistory || []}
          currentStatus={repair.status}
          style={{ marginTop: theme.spacing.sm }}
        />
      </Card>

      {/* Details Section */}
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <Text style={styles.sectionTitle}>{t('common.details')}</Text>

        {/* Reparaturnummer */}
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="wrench-outline" size={18} color={theme.colors.textSecondary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{t('repairs.repairNumber')}</Text>
            <Text style={styles.detailValue}>{repair.repairNumber || repair.number}</Text>
          </View>
        </View>

        {/* Auftragsnummer (Taifun) */}
        {repair.taifunRepairId ? (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color={theme.colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('repairs.orderNumber')}</Text>
              <Text style={styles.detailValue}>{repair.taifunRepairId}</Text>
            </View>
          </View>
        ) : null}

        {/* Kundennummer */}
        {repair.customer?.customerNumber ? (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={18} color={theme.colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('repairs.customerNumber')}</Text>
              <Text style={styles.detailValue}>{repair.customer.customerNumber}</Text>
            </View>
          </View>
        ) : null}

        {/* Datum */}
        {repair.createdAt || repair.receivedDate ? (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('repairs.receivedDate')}</Text>
              <Text style={styles.detailValue}>{formatDate(repair.createdAt || repair.receivedDate)}</Text>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Patience note for active repairs */}
      {repair.status !== 'ready' && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.info + '10', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.info} style={{ marginTop: 2 }} />
          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm, flex: 1, lineHeight: 20 }]}>
            {t('repairs.repairPatienceNote')}
          </Text>
        </View>
      )}

      {/* Invoice Section */}
      {repair.invoiceUrl ? (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={styles.sectionTitle}>{t('repairs.downloadInvoice')}</Text>
          <Button
            title={t('repairs.downloadInvoice')}
            onPress={handleDownloadInvoice}
            variant="secondary"
            fullWidth
            icon={
              <MaterialCommunityIcons
                name="file-download-outline"
                size={20}
                color={theme.colors.primary}
              />
            }
            style={{ marginTop: theme.spacing.sm }}
          />
        </Card>
      ) : null}

      {/* Rate Service Section */}
      {canRate ? (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={styles.sectionTitle}>{t('repairs.rateService')}</Text>

          <View style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
            <RatingStars
              rating={rating}
              size={36}
              interactive
              onRatingChange={setRating}
            />
          </View>

          <Input
            label={t('common.description')}
            value={ratingComment}
            onChangeText={setRatingComment}
            placeholder={t('common.optional')}
            multiline
            maxLength={500}
          />

          <Button
            title={t('common.save')}
            onPress={handleSubmitRating}
            variant="primary"
            fullWidth
            loading={submitRatingApi.loading}
            disabled={rating === 0}
          />
        </Card>
      ) : null}

      {/* Rating submitted confirmation */}
      {ratingSubmitted ? (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <View style={{ alignItems: 'center', padding: theme.spacing.md }}>
            <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.success} />
            <Text
              style={[
                theme.typography.styles.body,
                { color: theme.colors.text, marginTop: theme.spacing.sm, textAlign: 'center' },
              ]}
            >
              {t('common.success')}
            </Text>
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const s = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    repairNumber: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    deviceName: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    detailContent: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    detailLabel: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      marginTop: 2,
    },
  });
