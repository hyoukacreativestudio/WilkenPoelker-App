import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { getServerUrl } from '../api/client';

export function useSocket(ticketId) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(getServerUrl(), {
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    if (ticketId) {
      socket.emit('joinChat', ticketId);
    }

    return () => {
      if (ticketId) {
        socket.emit('leaveChat', ticketId);
      }
      socket.disconnect();
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
    socket: socketRef.current,
    onMessage,
    onTyping,
    onStopTyping,
    emitTyping,
    emitStopTyping,
  };
}
