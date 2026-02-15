import React, { createContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setConnectionType(state.type);

      if (!online && isOnline) {
        // Went offline
        setIsOnline(false);
        setShowBanner(true);
      } else if (online && !isOnline) {
        // Came back online
        setIsOnline(true);
        // Show "back online" briefly then hide
        setTimeout(() => setShowBanner(false), 3000);
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, [isOnline]);

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
