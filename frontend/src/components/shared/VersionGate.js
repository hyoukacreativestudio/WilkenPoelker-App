import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../api/client';

// Compare two "1.2.3" version strings. Returns -1/0/1 (a<b, a==b, a>b).
function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

/**
 * Checks the installed app version against the server once after login and
 * shows an update popup when a newer version is available. If the installed
 * version is below the minimum supported version the popup can't be dismissed.
 */
export default function VersionGate() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [info, setInfo] = useState(null); // { latest, minSupported, updateUrl, message }
  const [dismissed, setDismissed] = useState(false);

  const current = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get('/app-version');
        const data = res?.data?.data;
        if (active && data) setInfo(data);
      } catch (e) { /* offline / endpoint missing → no popup */ }
    })();
    return () => { active = false; };
  }, []);

  if (!info) return null;

  const outdated = compareVersions(current, info.latest) < 0;
  const forced = compareVersions(current, info.minSupported) < 0;

  if (!outdated || (dismissed && !forced)) return null;

  const openStore = () => {
    if (info.updateUrl) {
      Linking.openURL(info.updateUrl).catch(() => {});
    }
  };

  const s = styles(theme);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { if (!forced) setDismissed(true); }}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={[s.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
            <MaterialCommunityIcons name="cellphone-arrow-down" size={44} color={theme.colors.primary} />
          </View>
          <Text style={s.title}>{t('version.updateTitle', 'Update verfügbar')}</Text>
          <Text style={s.msg}>
            {info.message
              || t('version.updateMessage', 'Es ist eine neuere Version der App verfügbar. Bitte aktualisiere, um die neuesten Funktionen und Fehlerbehebungen zu erhalten.')}
          </Text>
          <Text style={s.versions}>
            {t('version.installed', 'Installiert')}: {current}  ·  {t('version.latest', 'Neu')}: {info.latest}
          </Text>

          {info.updateUrl ? (
            <TouchableOpacity style={[s.btn, { backgroundColor: theme.colors.primary }]} onPress={openStore} activeOpacity={0.85}>
              <MaterialCommunityIcons name="download" size={18} color="#FFFFFF" />
              <Text style={s.btnText}>{t('version.updateNow', 'Jetzt aktualisieren')}</Text>
            </TouchableOpacity>
          ) : null}

          {!forced ? (
            <TouchableOpacity style={s.later} onPress={() => setDismissed(true)}>
              <Text style={[s.laterText, { color: theme.colors.textSecondary }]}>
                {t('version.later', 'Später')}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[s.laterText, { color: theme.colors.error, marginTop: theme.spacing.md }]}>
              {t('version.required', 'Diese Version wird nicht mehr unterstützt. Ein Update ist erforderlich.')}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    ...theme.typography.styles.h4,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  msg: {
    ...theme.typography.styles.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  versions: {
    ...theme.typography.styles.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  btnText: {
    ...theme.typography.styles.body,
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.bold,
    marginLeft: 6,
  },
  later: {
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  laterText: {
    ...theme.typography.styles.body,
    textAlign: 'center',
  },
});
