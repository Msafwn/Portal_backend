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
  bulkUpdateUserStatusByAdmin,
  evaluateCandidateAiByAdmin,
  deleteUserByAdmin,
  getAllEmployersAdmin,
  getEmployerByIdAdmin,
  updateEmployerVerificationAdmin,
  bulkUpdateEmployerVerificationAdmin,
  deleteEmployerAdmin,
  getAdminDashboardStats,
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
// Executive Dashboard Analytics Route
router.get('/admin/dashboard', protect, authorizeRoles('admin', 'super_admin'), getAdminDashboardStats);

// Employer & Corporate Verification Admin Routes (must be before :id)
router.get('/admin/employers/all', protect, authorizeRoles('admin', 'super_admin'), getAllEmployersAdmin);
router.get('/admin/employers', protect, authorizeRoles('admin', 'super_admin'), getAllEmployersAdmin);
router.post('/admin/employers/bulk-verification', protect, authorizeRoles('admin', 'super_admin'), bulkUpdateEmployerVerificationAdmin);
router.get('/admin/employers/:id', protect, authorizeRoles('admin', 'super_admin'), getEmployerByIdAdmin);
router.put('/admin/employers/:id/verification', protect, authorizeRoles('admin', 'super_admin'), updateEmployerVerificationAdmin);
router.delete('/admin/employers/:id', protect, authorizeRoles('admin', 'super_admin'), deleteEmployerAdmin);

// Candidate Admin Routes
router.get('/admin/all', protect, authorizeRoles('admin', 'super_admin'), getAllUsersAdmin);
router.post('/admin/bulk-status', protect, authorizeRoles('admin', 'super_admin'), bulkUpdateUserStatusByAdmin);
router.post('/admin/:id/ai-evaluate', protect, authorizeRoles('admin', 'super_admin'), evaluateCandidateAiByAdmin);
router.put('/admin/:id/status', protect, authorizeRoles('admin', 'super_admin'), updateUserStatusByAdmin);
router.delete('/admin/:id', protect, authorizeRoles('admin', 'super_admin'), deleteUserByAdmin);
router.get('/admin/:id', protect, authorizeRoles('admin', 'super_admin'), getUserByIdAdmin);

export default router;
