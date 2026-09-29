import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

const server = app.listen(PORT, () => {
  console.log(`
==================================================
🚀 Smart Career Backend Server Running!
📡 Port: http://localhost:${PORT}
🕒 Environment: ${process.env.NODE_ENV || 'development'}
==================================================
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
