import express from 'express';
import {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  getEmployerAllApplications,
  getApplicationById,
  updateApplicationStatus,
  scheduleInterview,
  sendDirectInterviewEmail,
  withdrawApplication,
  evaluateApplicantATS,
} from '../controllers/applicationController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All application routes require authentication
router.use(protect);

// -------------------------------------------------------------
// Candidate Routes
// -------------------------------------------------------------
router.post(
  '/',
  authorizeRoles(
    'student',
    'fresh_graduate',
    'experienced',
    'professional',
    'admin'
  ),
  applyToJob
);

router.get(
  '/my',
  authorizeRoles(
    'student',
    'fresh_graduate',
    'experienced',
    'professional',
    'admin'
  ),
  getMyApplications
);

router.delete('/:id', withdrawApplication);

// -------------------------------------------------------------
// Employer & Recruiter Routes
// -------------------------------------------------------------
router.get(
  '/employer/all',
  authorizeRoles('employer', 'admin'),
  getEmployerAllApplications
);

router.get(
  '/job/:jobId',
  authorizeRoles('employer', 'admin'),
  getJobApplicants
);

router.patch(
  '/:id/status',
  authorizeRoles('employer', 'admin'),
  updateApplicationStatus
);

router.post(
  '/send-interview-email',
  authorizeRoles('employer', 'admin'),
  sendDirectInterviewEmail
);

router.post(
  '/:id/schedule-interview',
  authorizeRoles('employer', 'admin'),
  scheduleInterview
);

router.post(
  '/:id/ai-ats-evaluation',
  authorizeRoles('employer', 'admin'),
  evaluateApplicantATS
);

// -------------------------------------------------------------
// Shared Dossier Route
// -------------------------------------------------------------
router.get('/:id', getApplicationById);

export default router;
