import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { getServerUrl } from '../../api/client';
import { getInitials } from '../../utils/helpers';
import Card from '../ui/Card';

export default function TeamMember({ member, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { name, role, photo, phone, email } = member;

  return (
    <Card style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {/* Avatar */}
      {photo ? (
        <Image
          source={{ uri: photo.startsWith('http') ? photo : `${getServerUrl()}${photo}` }}
          style={{
            width: 60,
            height: 60,
            borderRadius: theme.borderRadius.round,
          }}
        />
      ) : (
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: theme.borderRadius.round,
            backgroundColor: theme.colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[theme.typography.styles.h5, { color: theme.colors.primary }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
        <Text
          style={[
            theme.typography.styles.h5,
            { color: theme.colors.text },
          ]}
        >
          {name}
        </Text>
        {role ? (
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {role}
          </Text>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {phone ? (
          <TouchableOpacity
            onPress={() => {
              const { openPhone } = require('../../utils/helpers');
              openPhone(phone);
            }}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.primaryLight,
              borderRadius: theme.borderRadius.round,
              marginRight: theme.spacing.sm,
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : null}

        {email ? (
          <TouchableOpacity
            onPress={() => {
              const { openEmail } = require('../../utils/helpers');
              openEmail(email);
            }}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.primaryLight,
              borderRadius: theme.borderRadius.round,
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
}
