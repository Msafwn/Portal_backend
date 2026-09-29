import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register a new user (Student / Graduate / Professional / Employer)
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    location,
    headline,
    bio,
    skills,
    education,
    experience,
    companyProfile,
  } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields');
  }

  // Check if user already exists
  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    throw new ApiError(409, 'A user with this email address already exists');
  }

  // Validate role if provided
  const validRoles = ['student', 'fresh_graduate', 'professional', 'employer'];
  const userRole = role ? role.toLowerCase() : 'student';
  if (!validRoles.includes(userRole)) {
    throw new ApiError(
      400,
      `Invalid role. Must be one of: ${validRoles.join(', ')}`
    );
  }

  // Normalize skills array
  let formattedSkills = [];
  if (Array.isArray(skills)) {
    formattedSkills = skills.map((s) =>
      typeof s === 'string'
        ? { name: s.trim().toLowerCase(), proficiency: 'Intermediate' }
        : s
    );
  }

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: userRole,
    phone,
    location,
    headline,
    bio,
    skills: formattedSkills,
    education: education || [],
    experience: experience || [],
    companyProfile: companyProfile || {},
    profileCompleted: true,
  });

  // Generate JWT token
  const token = generateToken(user._id);

  // Exclude password from response
  const createdUser = await User.findById(user._id).select('-password');

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: createdUser,
        token,
      },
      'User registered successfully'
    )
  );
});

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ApiError(400, 'Please provide both email and password');
  }

  // Find user by email (include password for verification)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  if (!user) {
    throw new ApiError(
      401,
      'Invalid credentials. No user found with this email.'
    );
  }

  // Compare password using User model method
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials. Password does not match.');
  }

  // Generate JWT token
  const token = generateToken(user._id);

  // Sanitize user object (omit password)
  const loggedInUser = await User.findById(user._id).select('-password');

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        token,
      },
      'User logged in successfully'
    )
  );
});

// @desc    Get currently logged in user
// @route   GET /api/auth/me
// @access  Private (Bearer Token required)
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, 'Current user profile fetched successfully')
    );
});

// @desc    Update user profile (Skills, Education, Experience, Bio)
// @route   PUT /api/auth/profile
// @access  Private (Bearer Token required)
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const allowedFields = [
    'name',
    'phone',
    'location',
    'headline',
    'bio',
    'skills',
    'education',
    'experience',
    'certifications',
    'companyProfile',
    'resumeUrl',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  user.profileCompleted = true;
  await user.save();

  const updatedUser = await User.findById(user._id).select('-password');

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'Profile updated successfully'));
});

// @desc    Logout user / clear session
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});
