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
  getAllJobsAdmin,
  getJobByIdAdmin,
  updateJobModerationStatusAdmin,
  bulkUpdateJobModerationStatusAdmin,
  deleteJobAdmin,
  bulkDeleteJobsAdmin,
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

router.post('/', protect, authorizeRoles('employer', 'admin'), createJob);

router.post(
  '/ai-generate-description',
  protect,
  authorizeRoles('employer', 'admin'),
  generateJobDescriptionAi
);

// -------------------------------------------------------------
// Admin Vacancy Moderation Endpoints (must be placed before /:id)
// -------------------------------------------------------------
router.get(
  '/admin/all',
  protect,
  authorizeRoles('admin', 'super_admin'),
  getAllJobsAdmin
);
router.post(
  '/admin/bulk-status',
  protect,
  authorizeRoles('admin', 'super_admin'),
  bulkUpdateJobModerationStatusAdmin
);
router.post(
  '/admin/bulk-delete',
  protect,
  authorizeRoles('admin', 'super_admin'),
  bulkDeleteJobsAdmin
);
router.get(
  '/admin/:id',
  protect,
  authorizeRoles('admin', 'super_admin'),
  getJobByIdAdmin
);
router.put(
  '/admin/:id/status',
  protect,
  authorizeRoles('admin', 'super_admin'),
  updateJobModerationStatusAdmin
);
router.delete(
  '/admin/:id',
  protect,
  authorizeRoles('admin', 'super_admin'),
  deleteJobAdmin
);

// -------------------------------------------------------------
// Single Job Details Dossier
// -------------------------------------------------------------
router.get('/:id', optionalProtect, getJobById);

router.put('/:id', protect, authorizeRoles('employer', 'admin'), updateJob);

router.delete('/:id', protect, authorizeRoles('employer', 'admin'), deleteJob);

export default router;
