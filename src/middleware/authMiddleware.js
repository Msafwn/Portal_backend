import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token =
    req.cookies?.accessToken ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    throw new ApiError(401, 'Unauthorized request: No access token provided');
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || 'access_secret_key'
    );

    const user = await User.findById(decoded?.id).select(
      '-password -refreshToken'
    );
    if (!user) {
      throw new ApiError(401, 'Invalid access token: User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || 'Invalid or expired access token'
    );
  }
});

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Role (${req.user.role}) is not authorized to access this resource`
      );
    }
    next();
  };
};
