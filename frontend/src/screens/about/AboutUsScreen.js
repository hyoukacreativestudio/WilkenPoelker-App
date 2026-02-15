import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../../components/shared/NotificationBell';

// Tab screens
import TeamTab from './tabs/TeamTab';
import StoreTab from './tabs/StoreTab';
import QMFTab from './tabs/QMFTab';
import KaercherTab from './tabs/KaercherTab';

const TABS = [
  { key: 'team', icon: 'account-group', labelKey: 'aboutUs.tabs.team', label: 'Unser Team' },
  { key: 'store', icon: 'store', labelKey: 'aboutUs.tabs.store', label: 'Ladengeschäft' },
  { key: 'qmf', icon: 'certificate-outline', labelKey: 'aboutUs.tabs.qmf', label: 'QMF' },
  { key: 'kaercher', icon: 'spray-bottle', labelKey: 'aboutUs.tabs.kaercher', label: 'Kärcher' },
];

function TabButton({ tab, isActive, onPress, theme, t }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[
          tabStyles.button,
          {
            backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
            borderColor: isActive ? theme.colors.primary : theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.borderRadius.lg,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.xs,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={tab.icon}
          size={20}
          color={isActive ? '#FFFFFF' : theme.colors.textSecondary}
        />
        <Text
          style={[
            theme.typography.styles.caption,
            {
              color: isActive ? '#FFFFFF' : theme.colors.textSecondary,
              fontWeight: isActive
                ? theme.typography.weights.bold
                : theme.typography.weights.medium,
              marginTop: 4,
              textAlign: 'center',
            },
          ]}
          numberOfLines={1}
        >
          {t(tab.labelKey, tab.label)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const tabStyles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
});

export default function AboutUsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('team');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ref to hold the active tab's saveAllChanges function
  const saveRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const s = styles(theme);

  // Register save function from active tab
  const registerSave = useCallback((saveFn) => {
    saveRef.current = saveFn;
  }, []);

  // Handle "Fertig" button press: save all changes, then exit edit mode
  const handleDone = useCallback(async () => {
    if (saveRef.current) {
      setIsSaving(true);
      try {
        await saveRef.current();
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditMode(false);
  }, []);

  // Place edit pencil left of notification bell in the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setIsEditMode((prev) => !prev)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                s.headerEditButton,
                isEditMode
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
              ]}
            >
              <MaterialCommunityIcons
                name={isEditMode ? 'pencil' : 'pencil-outline'}
                size={18}
                color={isEditMode ? '#FFFFFF' : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          <NotificationBell />
        </View>
      ),
    });
  }, [navigation, isAdmin, isEditMode, theme]);

  const renderTab = () => {
    switch (activeTab) {
      case 'team':
        return <TeamTab isEditMode={isEditMode} registerSave={registerSave} />;
      case 'store':
        return <StoreTab isEditMode={isEditMode} registerSave={registerSave} />;
      case 'qmf':
        return <QMFTab isEditMode={isEditMode} registerSave={registerSave} />;
      case 'kaercher':
        return <KaercherTab isEditMode={isEditMode} registerSave={registerSave} />;
      default:
        return <TeamTab isEditMode={isEditMode} registerSave={registerSave} />;
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
            theme={theme}
            t={t}
          />
        ))}
      </View>

      {/* Tab Content */}
      {renderTab()}

      {/* Floating Save / Done Button */}
      {isEditMode && (
        <TouchableOpacity
          onPress={handleDone}
          activeOpacity={0.85}
          disabled={isSaving}
          style={s.fab}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" />
          )}
          <Text style={s.fabText}>
            {isSaving
              ? t('aboutUs.edit.saving', 'Speichern...')
              : t('aboutUs.edit.done', 'Fertig')}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerEditButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.xl + 10,
      right: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.round,
      gap: 8,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      zIndex: 100,
    },
    fabText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
      fontFamily: theme.typography.fontFamily,
    },
  });
