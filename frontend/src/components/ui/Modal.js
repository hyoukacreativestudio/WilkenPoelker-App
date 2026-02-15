import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  animationType = 'slide',
}) {
  const { theme } = useTheme();

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: 'center',
          padding: theme.spacing.lg,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.xl,
              maxHeight: '80%',
              ...theme.shadows.lg,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.divider,
              }}
            >
              <Text
                style={[
                  theme.typography.styles.h5,
                  { color: theme.colors.text, flex: 1 },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>

              {showCloseButton ? (
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginLeft: theme.spacing.sm }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Content */}
            <ScrollView
              style={{ paddingHorizontal: theme.spacing.md }}
              contentContainerStyle={{ paddingVertical: theme.spacing.md }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}
