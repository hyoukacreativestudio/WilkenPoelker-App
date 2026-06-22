import { useEffect, useRef, useCallback, useState } from 'react';
import io from 'socket.io-client';
import { getServerUrl } from '../api/client';
import { storage } from '../utils/storage';

export function useSocket(ticketId) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Pass the JWT so the backend can authenticate the WebSocket handshake.
      const token = await storage.getItem('accessToken');
      if (cancelled) return;

      const socket = io(getServerUrl(), {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
        auth: { token },
      });

      socket.on('connect', () => {
        setConnected(true);
        if (ticketId) {
          socket.emit('joinChat', ticketId);
        }
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('connect_error', (err) => {
        // Surface auth errors silently; the response interceptor handles forced re-login.
        if (__DEV__) console.warn('Socket connect error:', err?.message);
      });

      socketRef.current = socket;
    })();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        if (ticketId) socket.emit('leaveChat', ticketId);
        socket.disconnect();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [ticketId]);

  const onMessage = useCallback((callback) => {
    socketRef.current?.on('newMessage', callback);
    return () => socketRef.current?.off('newMessage', callback);
  }, []);

  const onTyping = useCallback((callback) => {
    socketRef.current?.on('typing', callback);
    return () => socketRef.current?.off('typing', callback);
  }, []);

  const onStopTyping = useCallback((callback) => {
    socketRef.current?.on('stopTyping', callback);
    return () => socketRef.current?.off('stopTyping', callback);
  }, []);

  const emitTyping = useCallback((userId, username) => {
    if (ticketId) {
      socketRef.current?.emit('typing', { ticketId, userId, username });
    }
  }, [ticketId]);

  const emitStopTyping = useCallback(() => {
    if (ticketId) {
      socketRef.current?.emit('stopTyping', { ticketId });
    }
  }, [ticketId]);

  return {
    // expose connected state so consumers re-render when the socket attaches
    connected,
    onMessage,
    onTyping,
    onStopTyping,
    emitTyping,
    emitStopTyping,
    // helper for consumers that need to add custom listeners — they should call inside a useEffect
    socket: socketRef.current,
  };
}
