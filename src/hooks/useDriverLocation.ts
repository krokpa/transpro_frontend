'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { connectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

interface LocationState {
  activeTripId: string | null;
  speed: number;          // km/h
  isSupported: boolean;
}

export function useDriverLocation() {
  const { accessToken } = useAuthStore();
  const watchIdRef   = useRef<number | null>(null);
  const socketRef    = useRef<ReturnType<typeof getSocket> | null>(null);
  const [state, setState] = useState<LocationState>({
    activeTripId: null,
    speed: 0,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      socketRef.current?.disconnect();
    };
  }, []);

  const start = useCallback(async (tripId: string): Promise<boolean> => {
    if (!state.isSupported) return false;
    if (state.activeTripId === tripId) return true;

    // Arrêter l'éventuel partage précédent
    if (state.activeTripId) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      socketRef.current?.emit('location:update', { tripId: state.activeTripId, lat: 0, lng: 0 });
      socketRef.current?.disconnect();
    }

    // Connexion socket dédiée pour le chauffeur
    const s = connectSocket(accessToken ?? undefined);
    socketRef.current = s;
    s.emit('trip:join', { tripId });

    return new Promise((resolve) => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const speed = pos.coords.speed != null ? pos.coords.speed * 3.6 : 0;
          setState(prev => ({ ...prev, activeTripId: tripId, speed: Math.round(speed) }));
          s.emit('location:update', {
            tripId,
            lat:     pos.coords.latitude,
            lng:     pos.coords.longitude,
            heading: pos.coords.heading ?? 0,
            speed:   parseFloat(speed.toFixed(1)),
          });
          resolve(true);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          resolve(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
      setState(prev => ({ ...prev, activeTripId: tripId }));
    });
  }, [state.activeTripId, accessToken]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (state.activeTripId) {
      socketRef.current?.emit('location:update', { tripId: state.activeTripId, lat: 0, lng: 0 });
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setState(prev => ({ ...prev, activeTripId: null, speed: 0 }));
  }, [state.activeTripId]);

  return {
    activeTripId:  state.activeTripId,
    speed:         state.speed,
    isSupported:   state.isSupported,
    isSharing:     state.activeTripId !== null,
    isSharingTrip: (tripId: string) => state.activeTripId === tripId,
    start,
    stop,
  };
}
