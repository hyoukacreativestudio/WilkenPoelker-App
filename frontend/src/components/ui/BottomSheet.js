import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapPoints = ['50%'],
}) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const sheetHeight = parseFloat(snapPoints[0]) / 100 * SCREEN_HEIGHT;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.overlay,
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={{
                height: sheetHeight,
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.borderRadius.xl,
                borderTopRightRadius: theme.borderRadius.xl,
                transform: [{ translateY }],
                ...theme.shadows.xl,
              }}
            >
              {/* Drag Handle */}
              <View
                style={{
                  alignItems: 'center',
                  paddingTop: theme.spacing.sm,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: theme.borderRadius.round,
                    backgroundColor: theme.colors.border,
                  }}
                />
              </View>

              {/* Title */}
              {title ? (
                <View
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingBottom: theme.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.divider,
                  }}
                >
                  <Text
                    style={[
                      theme.typography.styles.h5,
                      { color: theme.colors.text, textAlign: 'center' },
                    ]}
                  >
                    {title}
                  </Text>
                </View>
              ) : null}

              {/* Content */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  padding: theme.spacing.md,
                }}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {children}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
