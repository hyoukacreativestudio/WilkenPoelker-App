import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Tabs({
  tabs = [],
  activeTab,
  onTabChange,
  style,
}) {
  const { theme } = useTheme();

  return (
    <View style={[{ backgroundColor: theme.colors.tabsBackground, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
              style={{
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                marginRight: theme.spacing.xs,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? theme.colors.primary : 'transparent',
              }}
            >
              <Text
                numberOfLines={1}
                style={[
                  theme.typography.styles.bodySmall,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isActive
                      ? theme.typography.weights.bold
                      : theme.typography.weights.regular,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
