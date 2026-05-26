import { io, Socket } from 'socket.io-client';
import { SocketEvent } from '@transpro/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(token?: string) {
  const s = getSocket();
  if (token) s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function joinTripRoom(tripId: string) {
  getSocket().emit(SocketEvent.JOIN_TRIP_ROOM, { tripId });
}

export function leaveTripRoom(tripId: string) {
  getSocket().emit(SocketEvent.LEAVE_TRIP_ROOM, { tripId });
}

export function joinCompanyRoom(tenantId: string) {
  getSocket().emit(SocketEvent.JOIN_COMPANY_ROOM, { tenantId });
}

export { SocketEvent };
