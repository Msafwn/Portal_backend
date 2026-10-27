import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  refreshAccessToken,
  updateUserByAdmin,
  getAllUsers,
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh-token', refreshAccessToken);
router.get('/csrf-token', (req, res) => {
  res.status(200).json({
    success: true,
    csrfToken: req.cookies?.['XSRF-TOKEN'] || null,
  });
});
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

// Admin User Management
router.get(
  '/users',
  protect,
  authorizeRoles('admin', 'super_admin'),
  getAllUsers
);
router.put(
  '/users/:id',
  protect,
  authorizeRoles('admin', 'super_admin'),
  updateUserByAdmin
);

export default router;
