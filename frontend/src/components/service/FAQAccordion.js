import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import AccordionSection from '../shared/AccordionSection';

export default function FAQAccordion({ faqs = [], style }) {
  const { theme } = useTheme();

  return (
    <View style={style}>
      {faqs.map((faq, index) => (
        <AccordionSection
          key={faq.id || index}
          title={
            <Text
              style={[
                theme.typography.styles.body,
                { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
              ]}
            >
              {faq.question}
            </Text>
          }
          style={index < faqs.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.colors.divider } : undefined}
        >
          <Text
            style={[
              theme.typography.styles.body,
              {
                color: theme.colors.textSecondary,
                paddingBottom: theme.spacing.md,
              },
            ]}
          >
            {faq.answer}
          </Text>
        </AccordionSection>
      ))}
    </View>
  );
}
