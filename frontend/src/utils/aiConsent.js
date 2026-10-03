import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CONSENT_KEY = '@ai_chat_consent';

// AI chat messages (and photos) go to OpenAI in the USA - ask for consent once,
// before the first message from any AI entry point (full chat or inline widget).
export async function ensureAiConsent(t) {
  try {
    if ((await AsyncStorage.getItem(AI_CONSENT_KEY)) === 'granted') return true;
  } catch {}
  return new Promise((resolve) => {
    Alert.alert(
      t('aiChat.consentTitle'),
      t('aiChat.consentMessage'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: t('aiChat.consentAccept'),
          onPress: async () => {
            await AsyncStorage.setItem(AI_CONSENT_KEY, 'granted').catch(() => {});
            resolve(true);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
