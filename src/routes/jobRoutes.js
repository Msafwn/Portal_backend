import express from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  generateJobDescriptionAi,
  updateJob,
  deleteJob,
  getEmployerMyJobs,
  getJobFiltersMeta,
} from '../controllers/jobController.js';
import { getCandidateRoleMatches } from '../controllers/candidateController.js';
import {
  protect,
  authorizeRoles,
  optionalProtect,
} from '../middleware/authMiddleware.js';

const router = express.Router();

// -------------------------------------------------------------
// Public / Candidate Enriched Endpoints
// -------------------------------------------------------------

// Job Feed with 50-30-20 AI scoring (optional auth attaches candidate match)
router.get('/', optionalProtect, getJobs);

// Metadata for feed search and filter pills
router.get('/meta/filters', getJobFiltersMeta);

// Candidate Role Matches & AI Skill Gap Roadmap
router.get('/role-matches', protect, getCandidateRoleMatches);

// -------------------------------------------------------------
// Employer Job Management Endpoints
// -------------------------------------------------------------
router.get(
  '/employer/my-jobs',
  protect,
  authorizeRoles('employer', 'admin'),
  getEmployerMyJobs
);

router.post(
  '/',
  protect,
  authorizeRoles('employer', 'admin'),
  createJob
);

router.post(
  '/ai-generate-description',
  protect,
  authorizeRoles('employer', 'admin'),
  generateJobDescriptionAi
);

// -------------------------------------------------------------
// Single Job Details Dossier
// -------------------------------------------------------------
router.get('/:id', optionalProtect, getJobById);

router.put(
  '/:id',
  protect,
  authorizeRoles('employer', 'admin'),
  updateJob
);

router.delete(
  '/:id',
  protect,
  authorizeRoles('employer', 'admin'),
  deleteJob
);

export default router;
