import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function HeaderBar({
  title,
  subtitle,
  leftAction,
  onLeftAction,
  rightActions = [],
  style,
}) {
  const { theme } = useTheme();

  const renderLeftAction = () => {
    if (!leftAction) return <View style={{ width: 40 }} />;

    if (leftAction === 'back') {
      return (
        <TouchableOpacity
          onPress={onLeftAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      );
    }

    // Custom component
    return <View style={{ width: 40 }}>{leftAction}</View>;
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          minHeight: 56,
        },
        style,
      ]}
    >
      {/* Left Action */}
      {renderLeftAction()}

      {/* Title Area */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={[
            theme.typography.styles.h5,
            { color: theme.colors.text },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Actions */}
      <View style={{ flexDirection: 'row', minWidth: 40, justifyContent: 'flex-end' }}>
        {rightActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={action.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={action.icon}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        ))}
        {rightActions.length === 0 ? <View style={{ width: 40 }} /> : null}
      </View>
    </View>
  );
}
