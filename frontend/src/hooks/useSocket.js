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
      if (cancelled) return;

      const socket = io(getServerUrl(), {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
        // Function form: the JWT is read on every (re)connect. Access tokens
        // expire after 15 min, a token captured once would fail later reconnects.
        auth: (cb) => {
          storage.getItem('accessToken').then((token) => cb({ token })).catch(() => cb({}));
        },
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

  // The socket is created asynchronously (after reading the token), so a listener
  // registered on the first render would find no socket. These helpers change
  // identity when the connection state changes, so consumers' effects re-run
  // and attach to the live socket.
  const listen = useCallback((event, callback) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, callback);
    return () => s.off(event, callback);
  }, [connected]);

  const onMessage = useCallback((callback) => listen('newMessage', callback), [listen]);
  const onTyping = useCallback((callback) => listen('typing', callback), [listen]);
  const onStopTyping = useCallback((callback) => listen('stopTyping', callback), [listen]);

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
