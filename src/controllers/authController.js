import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields');
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

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(201)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
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
    throw new ApiError(401, 'Invalid credentials. Password does not match.');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
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
    req.cookies.refreshToken || req.body.refreshToken;

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

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired or has been used');
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
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

  const updatedUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'Profile updated successfully'));
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

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});
