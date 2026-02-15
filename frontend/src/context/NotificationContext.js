import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { notificationsApi } from '../api/notifications';
import { AuthContext } from './AuthContext';
import { navigateFromNotification } from '../navigation/navigationRef';

export const NotificationContext = createContext(null);

// Configure default notification behavior with sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Poll interval: 60s to reduce server load with 10k+ users
// Push notifications handle real-time delivery; polling is only a fallback
const POLL_INTERVAL = 60000; // 60 seconds

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const pollInterval = useRef(null);

  const previousUnreadRef = useRef(0);

  // Play in-app notification sound (web-safe)
  const playNotificationSound = useCallback(() => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Web Audio API for a short notification beep
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880; // A5 note
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
      // On native, expo-notifications handles the sound via the channel config
    } catch {}
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationsApi.getUnreadCount();
      const newCount = data.data?.unreadCount || data.data?.count || 0;

      // Play sound when new notifications arrive
      if (newCount > previousUnreadRef.current && previousUnreadRef.current >= 0) {
        playNotificationSound();
      }
      previousUnreadRef.current = newCount;

      setUnreadCount(newCount);
    } catch {}
  }, [playNotificationSound]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      return;
    }

    fetchUnreadCount();

    // Poll for unread count periodically
    pollInterval.current = setInterval(fetchUnreadCount, POLL_INTERVAL);

    // Refresh on app foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        fetchUnreadCount();
      }
    });

    // Push notifications are not supported on web
    if (Platform.OS !== 'web') {
      registerForPushNotifications();

      // Listen for incoming notifications
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {
        fetchUnreadCount();
      });

      // Listen for notification taps → navigate to relevant screen
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.deepLink) {
          // Navigate using the deep link (string path or { type, id } object)
          navigateFromNotification(data.deepLink);
        } else if (data?.type && data?.repairId) {
          // Fallback: use type + repairId from push payload
          navigateFromNotification({ type: data.type, id: data.repairId });
        } else if (data?.type && data?.appointmentId) {
          navigateFromNotification({ type: data.type, id: data.appointmentId });
        } else if (data?.type && data?.ticketId) {
          navigateFromNotification({ type: data.type, id: data.ticketId });
        }
        // Refresh unread count after tap
        fetchUnreadCount();
      });
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      subscription?.remove();
      if (notificationListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setExpoPushToken(token);

      // Register token with backend
      const platform = Platform.OS;
      await notificationsApi.registerFcmToken(token, platform).catch(() => {});

      // Android notification channels with sound
      if (Platform.OS === 'android') {
        // Default channel with sound
        await Notifications.setNotificationChannelAsync('default', {
          name: 'WilkenPoelker',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        // Repair updates channel
        await Notifications.setNotificationChannelAsync('repairs', {
          name: 'Reparatur-Updates',
          description: 'Benachrichtigungen zu Reparaturstatus',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
        });

        // Appointment channel
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Termine',
          description: 'Terminerinnerungen und Vorschläge',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
        });
      }
    } catch {}
  };

  const decrementUnread = useCallback((count = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = {
    unreadCount,
    expoPushToken,
    fetchUnreadCount,
    decrementUnread,
    resetUnread,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
