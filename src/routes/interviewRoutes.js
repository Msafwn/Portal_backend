import express from 'express';
import {
  saveInterviewSession,
  getMyInterviews,
  getInterviewById,
  deleteInterview,
} from '../controllers/interviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All interview routes require login
router.use(protect);

router.post('/save', saveInterviewSession);
router.get('/my-history', getMyInterviews);
router.get('/:id', getInterviewById);
router.delete('/:id', deleteInterview);

export default router;
