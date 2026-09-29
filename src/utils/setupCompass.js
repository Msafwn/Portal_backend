import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Skill from '../models/Skill.js';
import SavedJob from '../models/SavedJob.js';

const setupCompassDatabase = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    console.log('🚀 Initializing Collections & Compass Schema Validators...');

    const collectionsToCreate = [
      {
        name: 'users',
        model: User,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'password', 'role'],
            properties: {
              name: { bsonType: 'string' },
              email: { bsonType: 'string' },
              password: { bsonType: 'string' },
              role: {
                enum: [
                  'student',
                  'fresh_graduate',
                  'professional',
                  'employer',
                  'admin',
                ],
              },
            },
          },
        },
      },
      {
        name: 'skills',
        model: Skill,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'category'],
            properties: {
              name: { bsonType: 'string' },
              category: { bsonType: 'string' },
            },
          },
        },
      },
      {
        name: 'jobs',
        model: Job,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: [
              'title',
              'company',
              'employer',
              'description',
              'requiredSkills',
            ],
            properties: {
              title: { bsonType: 'string' },
              company: { bsonType: 'string' },
              employer: { bsonType: 'objectId' },
              description: { bsonType: 'string' },
              requiredSkills: { bsonType: 'array' },
            },
          },
        },
      },
      {
        name: 'applications',
        model: Application,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['job', 'applicant', 'matchPercentage', 'status'],
            properties: {
              job: { bsonType: 'objectId' },
              applicant: { bsonType: 'objectId' },
              matchPercentage: { bsonType: 'number' },
              status: {
                enum: [
                  'Pending',
                  'Reviewed',
                  'Shortlisted',
                  'Interview Scheduled',
                  'Accepted',
                  'Rejected',
                ],
              },
            },
          },
        },
      },
      {
        name: 'savedjobs',
        model: SavedJob,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['user', 'job'],
            properties: {
              user: { bsonType: 'objectId' },
              job: { bsonType: 'objectId' },
            },
          },
        },
      },
    ];

    for (const item of collectionsToCreate) {
      try {
        console.log(`📦 Setting up collection: ${item.name}`);
        await db.createCollection(item.name, {
          validator: item.validator,
          validationAction: 'warn',
        });
      } catch (err) {
        if (err.code === 48 || err.codeName === 'NamespaceExists') {
          try {
            await db.command({
              collMod: item.name,
              validator: item.validator,
              validationAction: 'warn',
            });
          } catch (modErr) {
            // ignore if collMod warning
          }
        }
      }

      await item.model.createIndexes();
    }

    console.log('\n🌱 Populating Seed Data so all collections are visible...');

    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
      await Skill.insertMany([
        {
          name: 'react',
          category: 'Frontend',
          aliases: ['reactjs', 'react.js'],
        },
        { name: 'node.js', category: 'Backend', aliases: ['nodejs', 'node'] },
        { name: 'express.js', category: 'Backend', aliases: ['express'] },
        { name: 'mongodb', category: 'Database', aliases: ['mongo'] },
        { name: 'javascript', category: 'Frontend', aliases: ['js'] },
        { name: 'python', category: 'Data Science & AI', aliases: ['py'] },
        { name: 'docker', category: 'DevOps & Cloud', aliases: [] },
        { name: 'tailwind css', category: 'Frontend', aliases: ['tailwind'] },
        { name: 'git', category: 'DevOps & Cloud', aliases: ['github'] },
      ]);
    }

    let employer = await User.findOne({ email: 'recruiter@techlogix.com' });
    if (!employer) {
      employer = await User.create({
        name: 'TechLogix HR',
        email: 'recruiter@techlogix.com',
        password: 'password123',
        role: 'employer',
        phone: '+92 300 1234567',
        location: 'Lahore',
        companyProfile: {
          companyName: 'TechLogix Global Solutions',
          industry: 'Information Technology',
          website: 'https://techlogix.example.com',
        },
        profileCompleted: true,
      });
    }

    let student = await User.findOne({ email: 'obaid@example.com' });
    if (!student) {
      student = await User.create({
        name: 'Obaid Mushtaq',
        email: 'obaid@example.com',
        password: 'password123',
        role: 'student',
        phone: '+92 301 9876543',
        location: 'Sahiwal',
        headline: 'BSCS Final Year Student',
        skills: [
          { name: 'react', proficiency: 'Intermediate' },
          { name: 'javascript', proficiency: 'Intermediate' },
          { name: 'tailwind css', proficiency: 'Expert' },
        ],
        profileCompleted: true,
      });
    }

    let job = await Job.findOne({ title: 'Full Stack MERN Developer' });
    if (!job) {
      job = await Job.create({
        title: 'Full Stack MERN Developer',
        company: 'TechLogix Global Solutions',
        employer: employer._id,
        description: 'MERN Developer wanted with React and Node.js skills.',
        jobType: 'Full-Time',
        category: 'Software Development',
        requiredSkills: [
          { name: 'react', weight: 3, mandatory: true },
          { name: 'node.js', weight: 3, mandatory: true },
          { name: 'mongodb', weight: 2, mandatory: true },
        ],
        location: 'Lahore (Hybrid)',
        status: 'Open',
      });
    }

    const appCount = await Application.countDocuments();
    if (appCount === 0) {
      await Application.create({
        job: job._id,
        applicant: student._id,
        matchPercentage: 70,
        matchedSkills: ['react'],
        missingSkills: ['node.js', 'mongodb'],
        status: 'Pending',
        coverNote: 'Excited to apply for this role!',
      });
    }

    const savedCount = await SavedJob.countDocuments();
    if (savedCount === 0) {
      await SavedJob.create({
        user: student._id,
        job: job._id,
      });
    }

    console.log(`
==================================================
✅ 100% COMPLETE: All 5 Collections Created in Compass!
==================================================
1. users        (Document count: ${await User.countDocuments()})
2. skills       (Document count: ${await Skill.countDocuments()})
3. jobs         (Document count: ${await Job.countDocuments()})
4. applications (Document count: ${await Application.countDocuments()})
5. savedjobs    (Document count: ${await SavedJob.countDocuments()})
==================================================
Ab MongoDB Compass mein Refresh karein, saari collections
aur Validation Rules nazar aayengi!
==================================================
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in setupCompassDatabase:', error);
    process.exit(1);
  }
};

setupCompassDatabase();
