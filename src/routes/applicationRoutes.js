import express from 'express';
import {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/:jobId',
  protect,
  authorizeRoles('student', 'fresh_graduate', 'professional'),
  applyToJob
);
router.get(
  '/my-applications',
  protect,
  authorizeRoles('student', 'fresh_graduate', 'professional'),
  getMyApplications
);
router.get(
  '/job/:jobId',
  protect,
  authorizeRoles('employer'),
  getJobApplicants
);
router.put(
  '/:id/status',
  protect,
  authorizeRoles('employer'),
  updateApplicationStatus
);

export default router;
