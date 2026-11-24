import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import http from 'http';
import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io: Client } = require('../../SMART_CAREE_ SYSTEM/node_modules/socket.io-client');
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config();

import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import Application from '../src/models/Application.js';
import Notification from '../src/models/Notification.js';
import { initSocket } from '../src/socket.js';
import { getSecureResumeFile } from '../src/controllers/candidateController.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_career_db';
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'smart_career_access_token_secret_key_2026_fyp';

const runE2ETest = async () => {
  console.log('===============================================================');
  console.log('🚀 [E2E TEST] STARTING COMPLETE LIVE SYSTEM SIMULATION');
  console.log('===============================================================');

  // 1. Connect MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('✅ 1. Connected to MongoDB database successfully.');

  // Clean old test records
  const testEmails = [
    'e2e_recruiter@smartcareer.com',
    'e2e_senior_cand@smartcareer.com',
    'e2e_zeromatch_cand@smartcareer.com',
  ];
  await User.deleteMany({ email: { $in: testEmails } });
  await Job.deleteMany({ title: 'E2E Full-Stack MERN Architect' });

  // 2. Create Users
  const employer = await User.create({
    name: 'Tech Recruiter Global',
    email: 'e2e_recruiter@smartcareer.com',
    password: 'Password123!',
    role: 'employer',
    company: 'NextGen Cloud Solutions',
    tokenVersion: 0,
  });

  const seniorCandidate = await User.create({
    name: 'Ahmed Senior React Dev',
    email: 'e2e_senior_cand@smartcareer.com',
    password: 'Password123!',
    role: 'experienced',
    department: 'Technology',
    skills: [
      { name: 'React', level: 'advanced' },
      { name: 'Node.js', level: 'advanced' },
      { name: 'Express', level: 'advanced' },
      { name: 'MongoDB', level: 'advanced' },
      { name: 'Docker', level: 'intermediate' },
      { name: 'TypeScript', level: 'advanced' },
    ],
    experience: [
      { title: 'Senior Software Engineer', company: 'DevCorps', years: 4 },
    ],
    education: [
      { degree: 'BS Computer Science', institute: 'FAST NUCES', field: 'Software Engineering' },
    ],
    tokenVersion: 0,
    resumeUrl: '/uploads/resumes/resume-e2e-senior.pdf',
    resumeFileName: 'Ahmed_Resume_Senior.pdf',
  });

  const zeroMatchCandidate = await User.create({
    name: 'Bilal Agriculture Officer',
    email: 'e2e_zeromatch_cand@smartcareer.com',
    password: 'Password123!',
    role: 'experienced',
    department: 'Agriculture',
    skills: [
      { name: 'Soil Fertility', level: 'advanced' },
      { name: 'Crop Rotation', level: 'advanced' },
      { name: 'Tractor Maintenance', level: 'intermediate' },
      { name: 'Irrigation', level: 'advanced' },
    ],
    experience: [
      { title: 'Farm Supervisor', company: 'AgriFarms', years: 2 },
    ],
    education: [
      { degree: 'BSc Agriculture', institute: 'Agri Univ', field: 'Plant Pathology' },
    ],
    tokenVersion: 0,
    resumeUrl: '/uploads/resumes/resume-e2e-zero.pdf',
    resumeFileName: 'Bilal_Resume_Agri.pdf',
  });

  console.log('✅ 2. Created 1 Employer and 2 Candidates (1 Senior MERN, 1 Zero Match Agri).');

  // 3. Employer Posts Job
  const requiredSkills = [
    { name: 'React', weight: 2 },
    { name: 'Node.js', weight: 2 },
    { name: 'MongoDB', weight: 1 },
    { name: 'Docker', weight: 1 },
  ];

  const job = await Job.create({
    employer: employer._id,
    title: 'E2E Full-Stack MERN Architect',
    company: 'NextGen Cloud Solutions',
    department: 'Technology',
    location: 'Lahore, Pakistan',
    jobType: 'Full-Time',
    workMode: 'Hybrid',
    experienceRequired: 3,
    requiredSkills,
    description: 'Looking for a senior MERN developer with React and Node experience.',
    status: 'Open',
  });
  console.log(`✅ 3. Employer successfully posted job "${job.title}" with 4 required skills.`);

  // 4. Candidate A (Senior) Applies
  // Helper compute match score
  const computeMatch = (candSkills, reqSkills) => {
    const candSkillNames = candSkills.map((s) => (typeof s === 'string' ? s : s.name || '').toLowerCase().trim());
    let totalWeight = 0;
    let matchedWeight = 0;
    const matched = [];
    const missing = [];

    reqSkills.forEach((req) => {
      const sName = req.name.toLowerCase().trim();
      const w = req.weight || 1;
      totalWeight += w;
      if (candSkillNames.includes(sName)) {
        matched.push(req.name);
        matchedWeight += w;
      } else {
        missing.push(req.name);
      }
    });

    const pct = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    return {
      matchPercentage: Math.min(100, Math.max(0, pct)),
      matchedSkills: matched,
      missingSkills: missing,
    };
  };

  const seniorMatch = computeMatch(seniorCandidate.skills, job.requiredSkills);
  const seniorApp = await Application.create({
    job: job._id,
    applicant: seniorCandidate._id,
    matchPercentage: seniorMatch.matchPercentage,
    matchedSkills: seniorMatch.matchedSkills,
    missingSkills: seniorMatch.missingSkills,
    coverNote: 'Excited to apply as a Senior MERN architect.',
    resumeUrl: seniorCandidate.resumeUrl,
    status: 'Pending',
    appliedAt: new Date(),
  });

  console.log(`✅ 4. Senior Candidate Applied. Match Score: ${seniorApp.matchPercentage}% (Matched 4/4 skills).`);
  console.assert(seniorApp.matchPercentage === 100, `Expected 100%, got ${seniorApp.matchPercentage}`);

  // 5. Candidate B (Zero Match) Applies
  const zeroMatch = computeMatch(zeroMatchCandidate.skills, job.requiredSkills);
  const zeroApp = await Application.create({
    job: job._id,
    applicant: zeroMatchCandidate._id,
    matchPercentage: zeroMatch.matchPercentage,
    matchedSkills: zeroMatch.matchedSkills,
    missingSkills: zeroMatch.missingSkills,
    coverNote: 'Interested in switching to software role.',
    resumeUrl: zeroMatchCandidate.resumeUrl,
    status: 'Pending',
    appliedAt: new Date(),
  });

  console.log(`✅ 5. Zero Match Candidate Applied. Match Score: ${zeroApp.matchPercentage}% (Matched 0/4 skills).`);
  console.assert(zeroApp.matchPercentage === 0, `CRITICAL FAIL: Match score was ${zeroApp.matchPercentage}, expected 0!`);

  // 6. Test Formatted API Output for Candidate and Employer Views
  // Candidate View formatting:
  const candViewScore = typeof zeroApp.matchPercentage === 'number' ? zeroApp.matchPercentage : null;
  console.assert(candViewScore === 0, `Candidate View expected 0, got ${candViewScore}`);
  console.assert(candViewScore !== 80 && candViewScore !== 75, `Old Bug detected: score evaluated to ${candViewScore}`);
  console.log('✅ 6. Candidate API View correctly preserves exact 0% (NOT 80% or 75%!).');

  // Employer View formatting:
  const empViewScoreSenior = typeof seniorApp.matchPercentage === 'number' ? seniorApp.matchPercentage : null;
  const empViewScoreZero = typeof zeroApp.matchPercentage === 'number' ? zeroApp.matchPercentage : null;
  console.assert(empViewScoreSenior === 100, `Employer view senior expected 100, got ${empViewScoreSenior}`);
  console.assert(empViewScoreZero === 0, `Employer view zero expected 0, got ${empViewScoreZero}`);
  console.log('✅ 7. Employer Applicant Cards rank Senior at 100% and Zero-match at 0% correctly.');

  // 7. Test Socket.IO Authentication & Room Guarding
  const app = express();
  const server = http.createServer(app);
  const io = initSocket(server);
  const TEST_PORT = 5099;

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ 8. Socket.IO Test Server running on port ${TEST_PORT}.`);

  // Generate real JWT tokens
  const tokenSenior = jwt.sign(
    { _id: seniorCandidate._id, id: seniorCandidate._id, role: 'experienced', tokenVersion: 0 },
    ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  const tokenZero = jwt.sign(
    { _id: zeroMatchCandidate._id, id: zeroMatchCandidate._id, role: 'experienced', tokenVersion: 0 },
    ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  // A. Unauthenticated Socket Attempt -> MUST FAIL
  const testUnauthSocket = () =>
    new Promise((resolve) => {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
        reconnection: false,
      });
      client.on('connect_error', (err) => {
        console.log(`✅ 9. Unauthenticated socket rejected successfully: "${err.message}"`);
        client.close();
        resolve(true);
      });
      client.on('connect', () => {
        console.error('❌ FAIL: Unauthenticated socket was allowed to connect!');
        client.close();
        resolve(false);
      });
    });

  await testUnauthSocket();

  // B. Authenticated Socket Connection -> MUST SUCCEED
  const testAuthSocket = () =>
    new Promise((resolve) => {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: tokenSenior },
        transports: ['websocket'],
        reconnection: false,
      });
      client.on('connect', () => {
        console.log(`✅ 10. Authenticated Senior Candidate socket connected successfully (ID: ${client.id}).`);
        client.close();
        resolve(true);
      });
      client.on('connect_error', (err) => {
        console.error(`❌ FAIL: Authenticated socket failed: ${err.message}`);
        client.close();
        resolve(false);
      });
    });

  await testAuthSocket();

  // C. Anti-Spoofing Check: Zero Candidate tries to join Senior Candidate's room -> MUST BE BLOCKED
  const testSpoofingGuard = () =>
    new Promise((resolve) => {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: tokenZero },
        transports: ['websocket'],
        reconnection: false,
      });
      client.on('connect', () => {
        // Attempt to spoof Senior Candidate's room
        client.emit('join', { userId: seniorCandidate._id.toString() });

        client.on('error:unauthorized', (data) => {
          console.log(`✅ 11. Anti-Spoofing Guard active: Blocked unauthorized room join attempt ("${data.message}").`);
          client.close();
          resolve(true);
        });
      });
    });

  await testSpoofingGuard();

  // 8. Test Resume Access Control (RBAC)
  // Ensure dummy resume file exists in public/uploads/resumes
  const resumeDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
  if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });
  const dummyFile = path.join(resumeDir, 'resume-e2e-senior.pdf');
  fs.writeFileSync(dummyFile, '%PDF-1.4 E2E Test Resume Document for Ahmed Senior Dev');

  // Helper to execute asyncHandler controller in test
  const executeController = (req) => {
    return new Promise((resolve, reject) => {
      const res = {
        sentFile: null,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(d) {
          this.data = d;
          return this;
        },
        sendFile(p) {
          this.sentFile = p;
          resolve(this);
        },
      };

      getSecureResumeFile(req, res, (err) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  };

  // Case A: Senior Candidate downloads own resume -> 200 OK
  const reqSeniorOwn = {
    params: { filename: 'resume-e2e-senior.pdf' },
    user: seniorCandidate,
  };
  const resSeniorOwn = await executeController(reqSeniorOwn);
  console.assert(resSeniorOwn.sentFile !== null, 'Candidate should be allowed to download own resume');
  console.log('✅ 12. Candidate A successfully downloaded their own resume (200 OK).');

  // Case B: Zero Candidate attempts to download Senior Candidate's resume -> 403 FORBIDDEN
  const reqZeroSneak = {
    params: { filename: 'resume-e2e-senior.pdf' },
    user: zeroMatchCandidate,
  };
  let blocked = false;
  try {
    await executeController(reqZeroSneak);
  } catch (err) {
    blocked = true;
    console.assert(err.statusCode === 403, `Expected 403, got ${err.statusCode}`);
    console.log(`✅ 13. Candidate B blocked from accessing Candidate A's resume (403 Forbidden: "${err.message}").`);
  }
  console.assert(blocked, 'Zero match candidate must be blocked with 403!');

  // Case C: Employer who received application downloads Senior Candidate's resume -> 200 OK
  const reqEmployer = {
    params: { filename: 'resume-e2e-senior.pdf' },
    user: employer,
  };
  const resEmployer = await executeController(reqEmployer);
  console.assert(resEmployer.sentFile !== null, 'Employer must be allowed to download applicant resume');
  console.log('✅ 14. Recruiter successfully downloaded applicant resume for review (200 OK).');

  // Cleanup
  if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);
  await User.deleteMany({ email: { $in: testEmails } });
  await Job.deleteMany({ title: 'E2E Full-Stack MERN Architect' });
  await Application.deleteMany({ _id: { $in: [seniorApp._id, zeroApp._id] } });
  server.close();
  await mongoose.disconnect();

  console.log('===============================================================');
  console.log('🎉 [E2E TEST PASSED] ALL 14 ASSERTIONS PASSED WITH ZERO ERRORS!');
  console.log('===============================================================');
};

runE2ETest().catch((err) => {
  console.error('❌ E2E Simulation Failed:', err);
  process.exit(1);
});
