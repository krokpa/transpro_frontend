'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

type EventHandler = (...args: unknown[]) => void;

interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket({ autoConnect = true }: UseSocketOptions = {}) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect || !accessToken) return;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount — socket is a singleton shared across components.
      // Only disconnect when the user logs out (handled in Sidebar).
    };
  }, [accessToken, autoConnect]);

  const on = useCallback((event: string, handler: EventHandler) => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    getSocket().emit(event, data);
  }, []);

  const off = useCallback((event: string, handler?: EventHandler) => {
    getSocket().off(event, handler);
  }, []);

  return { on, emit, off, socket: socketRef };
}

export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const { on } = useSocket({ autoConnect: false });

  useEffect(() => {
    const cleanup = on(event, handler as EventHandler);
    return cleanup;
  }, [event, handler, on]);
}
