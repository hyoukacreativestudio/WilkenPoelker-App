import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Imprint = () => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      <ScrollView style={[styles.scroll, isDark && styles.scrollDark]}>
        <Text style={[styles.title, isDark && styles.textDark]}>Impressum</Text>
        
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Angaben gemäß § 5 TMG</Text>
        <Text style={[styles.text, isDark && styles.textDark]}>
          Wilken Poelker GmbH & Co. KG{"\n"}
          Langholter Straße 43{"\n"}
          26842 Osthauderfehn{"\n"}
          Telefon: 0 49 52 - 53 04{"\n"}
          E-Mail: info@wilkenpoelker.de{"\n"}
          www.wilkenpoelker.de
        </Text>

        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Vertreten durch:</Text>
        <Text style={[styles.text, isDark && styles.textDark]}>Geschäftsführer: [Name]</Text>

        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Umsatzsteuer-ID</Text>
        <Text style={[styles.text, isDark && styles.textDark]}>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE123456789</Text>

        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Haftungsausschluss</Text>
        <Text style={[styles.text, isDark && styles.textDark]}>
          Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 16 },
  scroll: { padding: 24 },
  scrollDark: { backgroundColor: '#1B5E20' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 24, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginTop: 24, marginBottom: 8 },
  text: { fontSize: 16, color: '#333', lineHeight: 24 },
  textDark: { color: '#E0E0E0' },
});

export default Imprint;