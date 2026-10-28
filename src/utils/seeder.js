import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Skill from '../models/Skill.js';
import SavedJob from '../models/SavedJob.js';
import Notification from '../models/Notification.js';
import InterviewSession from '../models/InterviewSession.js';
import ChatSession from '../models/ChatSession.js';
import AiSetting from '../models/AiSetting.js';
import AuditLog from '../models/AuditLog.js';
import SecurityAlert from '../models/SecurityAlert.js';
import LoginHistory from '../models/LoginHistory.js';

const seedCleanDatabase = async () => {
  try {
    await connectDB();

    console.log('🧹 [Database Reset] Clearing all collections from MongoDB...');
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      Application.deleteMany({}),
      Skill.deleteMany({}),
      SavedJob.deleteMany({}),
      Notification.deleteMany({}),
      InterviewSession.deleteMany({}),
      ChatSession.deleteMany({}),
      AiSetting.deleteMany({}),
      AuditLog.deleteMany({}),
      SecurityAlert.deleteMany({}),
      LoginHistory.deleteMany({}),
    ]);

    console.log('✅ All collections emptied successfully.');

    // =========================================================================
    // SEED SOLE SYSTEM ADMINISTRATOR (NO DUMMY / MOCK DATA)
    // =========================================================================
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    console.log(`👑 Creating sole System Administrator (${adminEmail})...`);

    const adminUser = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active',
      department: 'Administration & Operations',
      phone: '+92 300 0000000',
      location: 'Islamabad, Pakistan',
      headline: 'Lead System Auditor & Platform Administrator',
      bio: 'Super Administrator overseeing AI matchmaking accuracy, platform analytics, security audit trails, and user permissions.',
      skills: [
        { name: 'system administration', proficiency: 'Expert' },
        { name: 'audit logging', proficiency: 'Expert' },
        { name: 'ai pipeline monitoring', proficiency: 'Expert' },
      ],
      isEmailVerified: true,
      profileCompleted: true,
    });

    // Default Baseline AI Matching Weights Calibration
    await AiSetting.create({
      skillWeight: 50,
      experienceWeight: 30,
      educationWeight: 20,
      minMatchThreshold: 45,
      vectorEmbeddingModel: 'all-MiniLM-L6-v2 (384-dimensional dense vectors)',
      similarityMetric: 'Normalized Cosine Similarity + TF-IDF Keyword Hybrid',
      calibrationVersion: 'v2.4-Production-Arid-FYP',
      activePresetName: 'Official FYP Standard (50 / 30 / 20)',
      lastCalibrated: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
    });

    // Initial Audit Entry
    await AuditLog.create({
      action: 'Clean Database Initialization',
      detail: `Database wiped clean. Single administrator seeded: ${adminEmail}`,
      timestamp: 'Just now',
      type: 'info',
      actor: 'System Admin Seeder',
    });

    console.log(`
==================================================
✨ [CLEAN SEED COMPLETE]
All mock / dummy records removed from Database.
Only 1 System Administrator account exists:

📧 Email:    ${adminEmail}
🔑 Password: ${adminPassword}
🛡️ Role:     admin
==================================================`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ [Seeder Error]: ${error.message}`);
    process.exit(1);
  }
};

seedCleanDatabase();
