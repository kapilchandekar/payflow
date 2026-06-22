import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

// Map to store connected users: userId -> socketId
const userSockets = new Map<number, string>();

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // In production, restrict to your frontend URL
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: number };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`⚡ Socket connected: User ${userId} (${socket.id})`);
    
    // Store mapping
    userSockets.set(userId, socket.id);

    // Join a personal room so we can easily emit to all of a user's devices if they log in multiple times
    socket.join(`user_${userId}`);

    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: User ${userId} (${socket.id})`);
      // Only delete if it's the same socket (handles reconnects gracefully)
      if (userSockets.get(userId) === socket.id) {
        userSockets.delete(userId);
      }
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

// Helper function to emit events to a specific user
export const emitToUser = (userId: number, event: string, data: any) => {
  if (io) {
    // Send to the user's specific room
    io.to(`user_${userId}`).emit(event, data);
  }
};
