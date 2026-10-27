import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  updateSkills,
  deleteSkill,
  updateResume,
  getAllUsersAdmin,
  getUserByIdAdmin,
  updateUserStatusByAdmin,
  deleteUserByAdmin,
} from '../controllers/userController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ===================================
// USER / CANDIDATE PROFILE ROUTES
// ===================================
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changeUserPassword);

// Education CRUD
router.post('/education', protect, addEducation);
router.put('/education/:id', protect, updateEducation);
router.delete('/education/:id', protect, deleteEducation);

// Experience & Projects CRUD
router.post('/experience', protect, addExperience);
router.put('/experience/:id', protect, updateExperience);
router.delete('/experience/:id', protect, deleteExperience);

// Skills Management
router.put('/skills', protect, updateSkills);
router.delete('/skills/:skillName', protect, deleteSkill);

// Resume & ATS engine sync
router.post('/resume', protect, updateResume);

// ===================================
// ADMIN MANAGEMENT ROUTES
// ===================================
router.get('/admin/all', protect, authorizeRoles('admin', 'super_admin'), getAllUsersAdmin);
router.get('/admin/:id', protect, authorizeRoles('admin', 'super_admin'), getUserByIdAdmin);
router.put('/admin/:id/status', protect, authorizeRoles('admin', 'super_admin'), updateUserStatusByAdmin);
router.delete('/admin/:id', protect, authorizeRoles('admin', 'super_admin'), deleteUserByAdmin);

export default router;
