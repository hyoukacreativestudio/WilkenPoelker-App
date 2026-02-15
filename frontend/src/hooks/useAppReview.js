import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking, Alert } from 'react-native';

const REVIEW_STORAGE_KEY = '@app_review';
const LAUNCHES_UNTIL_PROMPT = 10;
const DAYS_UNTIL_PROMPT = 7;

/**
 * Hook to manage in-app review prompts.
 * Tracks app launches and prompts for review after threshold.
 *
 * Usage:
 *   const { trackLaunch, requestReviewIfReady } = useAppReview();
 *   // Call trackLaunch() on app start
 *   // Call requestReviewIfReady() after a positive user action
 */
export function useAppReview() {
  const trackLaunch = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
      const review = data ? JSON.parse(data) : {
        launchCount: 0,
        firstLaunch: Date.now(),
        hasReviewed: false,
        lastPrompt: null,
      };

      review.launchCount += 1;

      await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
    } catch {}
  }, []);

  const requestReviewIfReady = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
      if (!data) return false;

      const review = JSON.parse(data);

      // Already reviewed or recently prompted
      if (review.hasReviewed) return false;
      if (review.lastPrompt && Date.now() - review.lastPrompt < 30 * 24 * 60 * 60 * 1000) {
        return false;
      }

      // Check thresholds
      const daysSinceFirst = (Date.now() - review.firstLaunch) / (24 * 60 * 60 * 1000);
      if (review.launchCount < LAUNCHES_UNTIL_PROMPT || daysSinceFirst < DAYS_UNTIL_PROMPT) {
        return false;
      }

      // Try native in-app review first
      try {
        // StoreReview is available in Expo SDK 51+
        const StoreReview = require('expo-store-review');
        if (await StoreReview.isAvailableAsync()) {
          await StoreReview.requestReview();
          review.hasReviewed = true;
          review.lastPrompt = Date.now();
          await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
          return true;
        }
      } catch {
        // expo-store-review not installed, fall back to manual prompt
      }

      // Fallback: manual review prompt
      const storeUrl = Platform.select({
        ios: 'https://apps.apple.com/app/idXXXXXXXXXX', // Replace with real App Store ID
        android: 'https://play.google.com/store/apps/details?id=de.wilkenpoelker.app',
      });

      if (storeUrl) {
        Alert.alert(
          'App bewerten',
          'Gefällt Ihnen die WilkenPoelker App? Wir freuen uns über Ihre Bewertung!',
          [
            { text: 'Später', style: 'cancel' },
            { text: 'Nein danke', onPress: async () => {
              review.hasReviewed = true;
              await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
            }},
            { text: 'Bewerten', onPress: async () => {
              review.hasReviewed = true;
              review.lastPrompt = Date.now();
              await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
              Linking.openURL(storeUrl);
            }},
          ]
        );
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  return { trackLaunch, requestReviewIfReady };
}
