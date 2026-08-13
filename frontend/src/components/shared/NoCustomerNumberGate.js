import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { customerNumberApi } from '../../api/customerNumber';
import Button from '../ui/Button';

/**
 * Gate component that blocks access if user has no customer number.
 * Shows a message and button to request one. Pass children to show when customer number exists.
 * On mount (no number yet) it re-checks Taifun once — if a unique match is
 * found the number is linked and the gate opens without a re-login.
 */
export default function NoCustomerNumberGate({ children }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();

  const hasCustomerNumber = !!user?.customerNumber;
  const checkedRef = useRef(false);

  useEffect(() => {
    if (hasCustomerNumber || checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      try {
        const res = await customerNumberApi.selfCheck();
        const assigned = res?.data?.data?.assigned;
        const number = res?.data?.data?.customerNumber;
        if (assigned && number) {
          await updateUser({ customerNumber: number });
        }
      } catch (e) { /* silent — customer can still request manually */ }
    })();
  }, [hasCustomerNumber, updateUser]);

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
