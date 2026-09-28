import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { validators } from '../../utils/validators';

const TOTAL_SEGMENTS = 5;

export default function PasswordStrength({ password, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const strength = validators.getPasswordStrength(password);

  const getLabelText = (label) => {
    // Keys live under "auth" (auth.passwordStrength is a plain string there, not
    // a namespace) — the old "passwordStrength.*" paths never resolved, so the
    // English fallbacks showed in the German UI.
    const labels = {
      empty: t('auth.passwordEmpty', 'Enter a password'),
      weak: t('auth.weak', 'Weak'),
      fair: t('auth.fair', 'Fair'),
      good: t('auth.good', 'Good'),
      strong: t('auth.strong', 'Strong'),
      veryStrong: t('auth.veryStrong', 'Very Strong'),
    };
    return labels[label] || label;
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.barContainer,
          { gap: theme.spacing.xs },
        ]}
      >
        {Array.from({ length: TOTAL_SEGMENTS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor:
                  index < strength.score
                    ? strength.color
                    : theme.colors.border,
                borderRadius: theme.borderRadius.sm,
              },
            ]}
          />
        ))}
      </View>
      <Text
        style={[
          styles.label,
          {
            color: strength.score > 0 ? strength.color : theme.colors.textTertiary,
            marginTop: theme.spacing.xs,
            ...theme.typography.styles.caption,
          },
        ]}
      >
        {getLabelText(strength.label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  barContainer: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    height: 4,
  },
  label: {},
});
