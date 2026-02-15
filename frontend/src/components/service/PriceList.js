import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatPrice } from '../../utils/formatters';

export default function PriceList({ services = [], style }) {
  const { theme } = useTheme();

  // Group services by category
  const grouped = services.reduce((acc, service) => {
    const cat = service.category || '';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <View style={style}>
      {categories.map((category, catIndex) => (
        <View key={category || catIndex} style={{ marginBottom: theme.spacing.lg }}>
          {/* Category Header */}
          {category ? (
            <Text
              style={[
                theme.typography.styles.h6,
                {
                  color: theme.colors.text,
                  marginBottom: theme.spacing.sm,
                  paddingBottom: theme.spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.divider,
                },
              ]}
            >
              {category}
            </Text>
          ) : null}

          {/* Service Rows */}
          {grouped[category].map((service, index) => (
            <View
              key={service.id || index}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: index < grouped[category].length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.divider,
              }}
            >
              <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                <Text
                  style={[
                    theme.typography.styles.body,
                    { color: theme.colors.text },
                  ]}
                >
                  {service.name}
                </Text>
                {service.description ? (
                  <Text
                    style={[
                      theme.typography.styles.caption,
                      { color: theme.colors.textSecondary, marginTop: 2 },
                    ]}
                  >
                    {service.description}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  theme.typography.styles.body,
                  {
                    color: theme.colors.text,
                    fontWeight: theme.typography.weights.bold,
                    textAlign: 'right',
                  },
                ]}
              >
                {formatPrice(service.price)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
