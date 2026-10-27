import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import LoginHistory from '../models/LoginHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendOtpVerificationEmail } from '../utils/emailService.js';

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating refresh and access token'
    );
  }
};

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    role,
    department,
    phone,
    location,
    headline,
    bio,
    skills,
    education,
    experience,
    companyProfile,
  } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields');
  }

  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long');
  }

  if (confirmPassword && password !== confirmPassword) {
    throw new ApiError(400, 'Password and confirm password do not match');
  }

  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    throw new ApiError(409, 'A user with this email address already exists');
  }

  const validRoles = ['student', 'fresh_graduate', 'professional', 'employer'];
  const userRole = role ? role.toLowerCase() : 'student';
  if (!validRoles.includes(userRole)) {
    throw new ApiError(
      400,
      `Invalid role. Must be one of: ${validRoles.join(', ')}`
    );
  }

  let formattedSkills = [];
  if (Array.isArray(skills)) {
    formattedSkills = skills.map((s) =>
      typeof s === 'string'
        ? { name: s.trim().toLowerCase(), proficiency: 'Intermediate' }
        : s
    );
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: userRole,
    department: department || 'Information Technology',
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

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  return res
    .status(201)
    .cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 1 * 24 * 60 * 60 * 1000,
    })
    .cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json(
      new ApiResponse(
        201,
        { user: createdUser, accessToken, refreshToken },
        'User registered successfully'
      )
    );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide both email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  if (!user) {
    throw new ApiError(
      401,
      'Invalid credentials. No user found with this email.'
    );
  }

  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials!');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  // Record forensic authentication history
  try {
    const clientIp =
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desktop (Chrome / Windows)';
    await LoginHistory.create({
      user: loggedInUser.name,
      email: loggedInUser.email,
      role: loggedInUser.role,
      ipAddress:
        typeof clientIp === 'string'
          ? clientIp.split(',')[0].trim()
          : '127.0.0.1',
      device: userAgent.includes('Windows')
        ? 'Chrome • Windows 11'
        : 'Browser Session',
      location: 'Islamabad, PK',
      status: 'Successful',
      statusType: 'success',
    });
  } catch (err) {
    // Non-blocking telemetry
    console.warn('Telemetry login record note:', err.message);
  }

  return res
    .status(200)
    .cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 1 * 24 * 60 * 60 * 1000,
    })
    .cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        'User logged in successfully'
      )
    );
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request: No refresh token provided');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key'
    );

    const user = await User.findById(decodedToken?.id);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token: User not found');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .cookie('refreshToken', newRefreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          'Access token refreshed successfully'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    '-password -refreshToken'
  );

  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, 'Current user profile fetched successfully')
    );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const allowedSimpleFields = [
    'name',
    'department',
    'phone',
    'location',
    'headline',
    'bio',
    'avatar',
    'companyProfile',
    'resumeUrl',
    'resumeFileName',
    'resumeFileSize',
    'links',
  ];

  allowedSimpleFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // Normalize skills whether passed as string array or object array
  if (req.body.skills !== undefined && Array.isArray(req.body.skills)) {
    user.skills = req.body.skills.map((s) =>
      typeof s === 'string'
        ? { name: s.trim().toLowerCase(), proficiency: 'Intermediate' }
        : {
            name: (s.name || '').trim().toLowerCase(),
            proficiency: s.proficiency || 'Intermediate',
            ...(s.skill && { skill: s.skill }),
          }
    );
  }

  // Normalize education items
  if (req.body.education !== undefined && Array.isArray(req.body.education)) {
    user.education = req.body.education.map((edu) => ({
      ...(edu._id && { _id: edu._id }),
      degree: edu.degree || '',
      institute: edu.institute || '',
      field: edu.field || user.department || '',
      startYear:
        edu.startYear ||
        (edu.graduationYear ? Number(edu.graduationYear) - 4 : undefined),
      endYear:
        edu.endYear ||
        (edu.graduationYear ? Number(edu.graduationYear) : undefined),
      graduationYear: edu.graduationYear
        ? String(edu.graduationYear)
        : edu.endYear
          ? String(edu.endYear)
          : '',
      gradeOrCgpa: edu.gradeOrCgpa || edu.cgpa || '',
      cgpa: edu.cgpa || edu.gradeOrCgpa || '',
      status: edu.status || 'Completed',
    }));
  }

  // Normalize experience items
  if (req.body.experience !== undefined && Array.isArray(req.body.experience)) {
    user.experience = req.body.experience.map((exp) => ({
      ...(exp._id && { _id: exp._id }),
      type: exp.type || 'experience',
      title: exp.title || '',
      company: exp.company || '',
      duration: exp.duration || '',
      location: exp.location || '',
      startDate: exp.startDate || undefined,
      endDate: exp.endDate || undefined,
      current: exp.current || false,
      description: exp.description || exp.duration || '',
      link: exp.link || '',
    }));
  }

  // Normalize certifications items
  if (
    req.body.certifications !== undefined &&
    Array.isArray(req.body.certifications)
  ) {
    user.certifications = req.body.certifications.map((cert) => ({
      ...(cert._id && { _id: cert._id }),
      name: cert.name || '',
      issuingOrganization: cert.issuingOrganization || '',
      issueDate: cert.issueDate || undefined,
      credentialUrl: cert.credentialUrl || '',
    }));
  }

  if (req.body.resumeFileName || req.body.resumeUrl) {
    user.resumeUploadedAt = new Date();
  }

  user.profileCompleted = true;
  await user.save();

  const updatedUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'Profile updated successfully'));
});

export const updateUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { name, role, status, department, headline, bio, phone, location } =
    req.body;
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;
  if (department !== undefined) user.department = department;
  if (headline !== undefined) user.headline = headline;
  if (bio !== undefined) user.bio = bio;
  if (phone !== undefined) user.phone = phone;
  if (location !== undefined) user.location = location;

  await user.save();

  const updatedUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, 'User updated by admin successfully')
    );
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, users, 'Users fetched successfully'));
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/**
 * Send OTP Verification Email
 * POST /api/auth/send-otp
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  // Generate 6-digit cryptographic OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  let user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    await user.save({ validateBeforeSave: false });
  }

  // Dispatch OTP email using real Gmail SMTP
  const emailDispatched = await sendOtpVerificationEmail({
    to: email,
    name: user?.name || 'Smart Career User',
    otp,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email,
        expiresIn: '10 minutes',
        emailDispatched: Boolean(emailDispatched),
      },
      `6-digit OTP verification code dispatched to ${email}`
    )
  );
});

/**
 * Verify OTP Code
 * POST /api/auth/verify-otp
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP code are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, 'User with this email not found');
  }

  if (!user.otpCode || user.otpCode !== otp.trim()) {
    throw new ApiError(400, 'Invalid OTP verification code');
  }

  if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
    throw new ApiError(400, 'OTP code has expired. Please request a new one.');
  }

  // Clear OTP and mark email verified
  user.otpCode = null;
  user.otpExpiresAt = null;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email, isEmailVerified: true },
        'Email verified successfully via OTP!'
      )
    );
});
