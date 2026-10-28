import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        // Allow unauthenticated connection but without private room authorization
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smart_career_super_secret_jwt_key_2026');
      const user = await User.findById(decoded.id || decoded._id).select('-password');
      if (user) {
        socket.user = user;
      }
      return next();
    } catch (err) {
      // Allow fallback connection, user can join via 'join' event
      return next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?._id?.toString() || socket.handshake.query?.userId;

    if (userId) {
      socket.join(`user:${userId}`);
      if (socket.user?.role) {
        socket.join(`role:${socket.user.role}`);
      }
      console.log(`🔌 [WebSocket] User connected: ${userId} (Socket ID: ${socket.id})`);
    }

    // Client can explicitly join their user room with their userId
    socket.on('join', ({ userId: clientUserId, role }) => {
      if (clientUserId) {
        socket.join(`user:${clientUserId}`);
        if (role) socket.join(`role:${role}`);
        console.log(`🔌 [WebSocket] Client joined room: user:${clientUserId} (Role: ${role || 'user'})`);
      }
    });

    // Client ping for latency / health check
    socket.on('ping:health', () => {
      socket.emit('pong:health', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [WebSocket] Client disconnected (${socket.id}): ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn('⚠️ [WebSocket] Socket.io has not been initialized yet.');
  }
  return io;
};

/**
 * Emit a live real-time notification to a specific candidate or user
 */
export const emitNotificationToUser = (userId, notification) => {
  if (!io || !userId) return;
  const targetRoom = `user:${userId.toString()}`;
  io.to(targetRoom).emit('notification:new', notification);
};

/**
 * Emit real-time notification to an entire role pool (e.g. 'admin', 'employer')
 */
export const emitNotificationToRole = (role, notification) => {
  if (!io || !role) return;
  const targetRoom = `role:${role}`;
  io.to(targetRoom).emit('notification:new', notification);
};
