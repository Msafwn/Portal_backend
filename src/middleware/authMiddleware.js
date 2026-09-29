import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        throw new ApiError(
          401,
          'User associated with this token no longer exists'
        );
      }

      return next();
    } catch (error) {
      throw new ApiError(
        401,
        error.message || 'Not authorized, token failed or expired'
      );
    }
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no authentication token provided');
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
