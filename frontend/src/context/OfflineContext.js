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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setConnectionType(state.type);

      if (!online && isOnlineRef.current) {
        // Went offline
        isOnlineRef.current = false;
        setIsOnline(false);
        setShowBanner(true);
      } else if (online && !isOnlineRef.current) {
        // Came back online
        isOnlineRef.current = true;
        setIsOnline(true);
        // Show "back online" briefly then hide
        bannerTimeoutRef.current = setTimeout(() => setShowBanner(false), 3000);
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      setIsOnline(online);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
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
