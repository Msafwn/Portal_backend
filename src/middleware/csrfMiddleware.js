import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Enterprise Double-Submit Cookie CSRF/XSRF Protection Middleware
 * Compatible with Axios xsrfCookieName ('XSRF-TOKEN') & xsrfHeaderName ('X-XSRF-TOKEN')
 */
export const csrfProtection = (req, res, next) => {
  // 1. Ensure client has an XSRF-TOKEN cookie available for Axios to read
  let csrfCookie = req.cookies?.['XSRF-TOKEN'];

  if (!csrfCookie) {
    csrfCookie = crypto.randomBytes(24).toString('hex');
    res.cookie('XSRF-TOKEN', csrfCookie, {
      httpOnly: false, // MUST be false so Axios can read it from document.cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
  }

  // 2. Safe read-only HTTP methods do not alter state, so proceed
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // 3. Extract CSRF token header submitted by Axios
  const csrfHeader =
    req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];

  // Skip CSRF check for initial unauthenticated login/register calls
  const isAuthInitial =
    req.originalUrl?.includes('/auth/login') ||
    req.originalUrl?.includes('/auth/register');

  if (isAuthInitial && !req.cookies?.accessToken) {
    return next();
  }

  // 4. Validate matching double-submit token for state-changing operations
  if (csrfHeader && csrfCookie && csrfHeader === csrfCookie) {
    return next();
  }

  // If request has active session cookies but mismatched or missing CSRF token, reject
  if (req.cookies?.accessToken || req.cookies?.refreshToken) {
    if (!csrfHeader || csrfHeader !== csrfCookie) {
      throw new ApiError(
        403,
        'CSRF Protection: Missing or invalid X-XSRF-TOKEN header'
      );
    }
  }

  next();
};

export default csrfProtection;
