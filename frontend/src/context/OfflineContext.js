import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  // Track online state inside the effect using a ref to avoid re-registering the listener
  const isOnlineRef = useRef(true);
  const bannerTimeoutRef = useRef(null);
  const offlineTimerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setConnectionType(state.type);

      if (online && offlineTimerRef.current) {
        // A short blip (e.g. iOS re-checking reachability after the app comes
        // back to the foreground, or a slow reachability probe): ignore it.
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }

      if (!online && isOnlineRef.current && !offlineTimerRef.current) {
        // Only treat it as offline when it lasts a few seconds, otherwise the
        // whole app is replaced by the "Keine Verbindung" screen for nothing.
        offlineTimerRef.current = setTimeout(() => {
          offlineTimerRef.current = null;
          isOnlineRef.current = false;
          setIsOnline(false);
          setShowBanner(true);
        }, 6000);
      } else if (online && !isOnlineRef.current) {
        // Came back online
        isOnlineRef.current = true;
        setIsOnline(true);
        // Show "back online" briefly then hide
        bannerTimeoutRef.current = setTimeout(() => setShowBanner(false), 3000);
      }
    });

    // Initial check
    // Only a definite "no network" counts at start; reachability is often
    // still unknown or wrong for a moment right after launch.
    NetInfo.fetch().then((state) => {
      const online = state.isConnected !== false;
      isOnlineRef.current = online;
      setIsOnline(online);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  const value = {
    isOnline,
    connectionType,
    showBanner,
    dismissBanner,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
