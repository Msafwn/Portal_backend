import express from 'express';
import {
  createJob,
  getJobs,
  getJobById,
  getEmployerJobs,
  deleteJob,
} from '../controllers/jobController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Middleware to optionally extract user if token is sent
const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
};

router
  .route('/')
  .get(optionalAuth, getJobs)
  .post(protect, authorizeRoles('employer'), createJob);
router
  .route('/employer/my-jobs')
  .get(protect, authorizeRoles('employer'), getEmployerJobs);
router
  .route('/:id')
  .get(optionalAuth, getJobById)
  .delete(protect, authorizeRoles('employer'), deleteJob);

export default router;
