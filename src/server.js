import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket.js';

const PORT = process.env.PORT || 5000;

connectDB();

const httpServer = http.createServer(app);

// Initialize WebSocket Socket.io server
initSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`
==================================================
🚀 Smart Career Backend Server Running!
📡 Port: http://localhost:${PORT}
⚡ WebSocket: ws://localhost:${PORT}
🕒 Environment: ${process.env.NODE_ENV || 'development'}
==================================================
  `);
});

process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
