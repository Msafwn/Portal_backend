import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

let io = null;

/**
 * Helper to extract cookie value by name from cookie header string
 */
const parseCookie = (cookieHeader, key) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Strict Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token ||
        parseCookie(socket.handshake.headers?.cookie, 'accessToken');

      if (!token) {
        return next(new Error('Authentication error: Token required for WebSocket connection'));
      }

      const secret =
        process.env.ACCESS_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        'smart_career_access_token_secret_key_2026_fyp';

      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (jwtErr) {
        return next(new Error(`Authentication error: Invalid or expired token (${jwtErr.message})`));
      }

      const user = await User.findById(decoded._id || decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found in database'));
      }

      // Token Revocation Check: Ensure tokenVersion matches
      if (
        decoded.tokenVersion !== undefined &&
        user.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion
      ) {
        return next(new Error('Authentication error: Session revoked. Please log in again.'));
      }

      // Attach verified database identity to socket
      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const verifiedUserId = socket.user._id.toString();
    const verifiedRole = socket.user.role;

    // Automatically join verified user and role rooms ONLY
    socket.join(`user:${verifiedUserId}`);
    if (verifiedRole) {
      socket.join(`role:${verifiedRole}`);
    }
    console.log(`🔌 [WebSocket] Verified connection: ${verifiedUserId} (Role: ${verifiedRole}, Socket ID: ${socket.id})`);

    // Guarded 'join' event: Strictly disallow joining other users' private rooms
    socket.on('join', ({ userId: requestedUserId, role: requestedRole }) => {
      if (requestedUserId && requestedUserId.toString() !== verifiedUserId) {
        console.warn(`🚨 [Security Alert] Socket ${socket.id} (User: ${verifiedUserId}) attempted unauthorized room join: user:${requestedUserId}`);
        return socket.emit('error:unauthorized', {
          message: 'Security Violation: Cannot join another user\'s private channel',
        });
      }

      if (requestedRole && requestedRole !== verifiedRole) {
        console.warn(`🚨 [Security Alert] Socket ${socket.id} (User: ${verifiedUserId}) attempted unauthorized role join: role:${requestedRole}`);
        return socket.emit('error:unauthorized', {
          message: 'Security Violation: Cannot join unauthorized role channel',
        });
      }

      // Re-join own verified room safely
      socket.join(`user:${verifiedUserId}`);
      if (verifiedRole) socket.join(`role:${verifiedRole}`);
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
