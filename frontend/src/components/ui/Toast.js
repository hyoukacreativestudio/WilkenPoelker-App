import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Animated,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const ToastContext = createContext(null);

const TOAST_ICONS = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

const AUTO_DISMISS_MS = 3000;

function ToastItem({ toast, onDismiss, theme }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return { bg: theme.colors.success, text: '#FFFFFF' };
      case 'error':
        return { bg: theme.colors.error, text: '#FFFFFF' };
      case 'warning':
        return { bg: theme.colors.warning, text: '#FFFFFF' };
      case 'info':
        return { bg: theme.colors.info, text: '#FFFFFF' };
      default:
        return { bg: theme.colors.text, text: theme.colors.background };
    }
  };

  const colors = getColors();
  const iconName = TOAST_ICONS[toast.type] || 'information';

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.xs,
      }}
    >
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bg,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.sm,
          ...theme.shadows.md,
        }}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={22}
          color={colors.text}
          style={{ marginRight: theme.spacing.sm }}
        />
        <Text
          style={[
            theme.typography.styles.bodySmall,
            { color: colors.text, flex: 1 },
          ]}
          numberOfLines={2}
        >
          {toast.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }) {
  const { theme } = useTheme();
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const showToast = useCallback(({ type = 'info', message }) => {
    const id = ++idCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <SafeAreaView
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
        }}
        pointerEvents="box-none"
      >
        <View style={{ paddingTop: theme.spacing.sm }} pointerEvents="box-none">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
              theme={theme}
            />
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
