import express from 'express';
import {
  getCandidateDashboard,
  getCandidateProfile,
  updateCandidateProfile,
  uploadAvatarFile,
  getSkills,
  addSkill,
  updateSkills,
  deleteSkill,
  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  getExperience,
  addExperience,
  updateExperience,
  deleteExperience,
  getCertifications,
  addCertification,
  deleteCertification,
  uploadResumeFile,
  deleteResume,
  updateResume,
  getResumeAnalysis,
  changeCandidatePassword,
  getCandidateRoleMatches,
} from '../controllers/candidateController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar, uploadResume } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All candidate endpoints require authentication
router.use(protect);

// 1. Profile Overview (GET & PUT)
router.get('/dashboard', getCandidateDashboard);
router.get('/profile', getCandidateProfile);
router.put('/profile', updateCandidateProfile);

// Role Matches & AI Skill Gap Roadmap
router.get('/role-matches', getCandidateRoleMatches);

// 2. Avatar Upload
router.post('/upload-avatar', uploadAvatar, uploadAvatarFile);

// 3. Technical Skills (CRUD)
router.get('/skills', getSkills);
router.post('/skills/add', addSkill);
router.post('/skills', updateSkills);
router.delete('/skills/:skillName', deleteSkill);

// 4. Education Credentials (CRUD)
router.get('/education', getEducation);
router.post('/education', addEducation);
router.put('/education/:id', updateEducation);
router.delete('/education/:id', deleteEducation);

// 5. Work Experience & Projects (CRUD)
router.get('/experience', getExperience);
router.post('/experience', addExperience);
router.put('/experience/:id', updateExperience);
router.delete('/experience/:id', deleteExperience);

// 6. Certifications (CRUD)
router.get('/certifications', getCertifications);
router.post('/certifications', addCertification);
router.delete('/certifications/:id', deleteCertification);

// 7. Resume & ATS Diagnostics
router.post('/upload-resume', uploadResume, uploadResumeFile);
router.post('/resume', updateResume);
router.delete('/resume', deleteResume);
router.get('/resume-analysis', getResumeAnalysis);

// 8. Password & Security
router.put('/change-password', changeCandidatePassword);

export default router;
