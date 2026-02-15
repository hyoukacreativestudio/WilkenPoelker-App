import React from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function LoadingOverlay({ visible, message }) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.card,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              ...theme.shadows.lg,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  color: theme.colors.text,
                  marginTop: theme.spacing.md,
                  ...theme.typography.styles.body,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    minWidth: 120,
  },
  message: {
    textAlign: 'center',
  },
});
