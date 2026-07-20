import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  // If a socket already exists and is connected, reuse it
  if (socket && socket.connected) return socket;

  // If a stale/disconnected socket exists, clean it up first
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to WebSocket');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Disconnected from WebSocket:', reason);
  });

  socket.on('connect_error', (error) => {
    // Only log auth errors — these happen when the token is expired
    // The useSocket hook handles reconnection with a fresh token
    if (error.message.includes('Authentication error')) {
      console.warn('Socket auth failed (token may be expired). Will retry with fresh token.');
    } else {
      console.error('Socket connection error:', error.message);
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};