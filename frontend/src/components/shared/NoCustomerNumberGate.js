import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { customerNumberApi } from '../../api/customerNumber';
import { usersApi } from '../../api/users';
import Button from '../ui/Button';

/**
 * Gate that blocks access if the user has no customer number. Each time the
 * screen gains focus (while there's still no number) it (1) refetches the
 * profile — so a number a staff member added manually appears without a
 * re-login — and (2) re-checks Taifun for an auto-match. As soon as a number is
 * found it's written into the auth context and the gate opens.
 */
export default function NoCustomerNumberGate({ children }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();

  const hasCustomerNumber = !!user?.customerNumber;

  const pickNumber = (resp) => {
    const d = resp?.data?.data ?? resp?.data ?? resp;
    return d?.user?.customerNumber || d?.customerNumber || null;
  };

  useFocusEffect(
    useCallback(() => {
      if (hasCustomerNumber) return undefined;
      let active = true;
      (async () => {
        try {
          // 1) refetch profile → reflects a manual admin assignment
          const prof = await usersApi.getProfile();
          const pnum = pickNumber(prof);
          if (pnum) { if (active) await updateUser({ customerNumber: pnum }); return; }
          // 2) try a Taifun auto-match
          const res = await customerNumberApi.selfCheck();
          const num = pickNumber(res);
          if (num && active) await updateUser({ customerNumber: num });
        } catch (e) { /* silent — customer can still request manually */ }
      })();
      return () => { active = false; };
    }, [hasCustomerNumber, updateUser])
  );

  if (hasCustomerNumber) {
    return children;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.warning + '15' }]}>
          <MaterialCommunityIcons name="card-account-details-outline" size={48} color={theme.colors.warning} />
        </View>

        <Text style={[theme.typography.styles.h4, { color: theme.colors.text, textAlign: 'center', marginTop: theme.spacing.lg }]}>
          {t('customerNumber.noCustomerNumber')}
        </Text>

        <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm }]}>
          {t('customerNumber.noCustomerNumberInfo')}
        </Text>

        <Button
          title={t('customerNumber.requestButton')}
          onPress={() => navigation.navigate('Service', { screen: 'CustomerNumberRequest' })}
          fullWidth
          style={{ marginTop: theme.spacing.lg }}
          icon="card-account-details-outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
