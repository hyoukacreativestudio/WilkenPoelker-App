import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { notificationsApi } from '../api/notifications';
import { AuthContext } from './AuthContext';
import { navigateFromNotification } from '../navigation/navigationRef';
import { storage } from '../utils/storage';

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

  // Play in-app notification sound (web-safe) - pleasant two-tone chime
  const playNotificationSound = useCallback(() => {
    try {
      if (Platform.OS === 'web') {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;

        // First tone: C6 (soft)
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 523.25; // C5
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // Second tone: E5 (slightly higher, pleasant interval)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 659.25; // E5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);
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

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'eb70f600-3921-4ce9-b547-d3a83665d4d8',
      });
      const token = tokenData.data;
      setExpoPushToken(token);

      // Persist token for cleanup on logout
      await storage.setItem('expoPushToken', token).catch(() => {});

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
