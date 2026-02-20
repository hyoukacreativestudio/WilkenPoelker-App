import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { getServerUrl } from '../../api/client';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function hashStringToColor(str) {
  if (!str) return '#888888';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#009688', '#4CAF50', '#FF9800',
    '#FF5722', '#795548', '#607D8B', '#F44336',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({
  source,
  name,
  size = 40,
  style,
}) {
  const { theme } = useTheme();

  const [imageError, setImageError] = useState(false);
  const fontSize = Math.round(size * 0.4);

  const bgColor = hashStringToColor(name);
  const initials = getInitials(name);

  if (source && !imageError) {
    const imageUri = typeof source === 'string'
      ? (source.startsWith('http') ? source : `${getServerUrl()}${source}`)
      : null;
    return (
      <Image
        source={imageUri ? { uri: imageUri } : source}
        style={[
          {
            width: size,
            height: size,
            borderRadius: theme.borderRadius.round,
            backgroundColor: theme.colors.skeleton,
          },
          style,
        ]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.borderRadius.round,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize,
          fontWeight: theme.typography.weights.bold,
          fontFamily: theme.typography.fontFamily,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
