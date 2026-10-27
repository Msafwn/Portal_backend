import rateLimit from 'express-rate-limit';

/**
 * General Auth Limiter (Login, Refresh Token)
 * Limits each IP to 10 requests per 15-minute window
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    retryAfterMinutes: 15,
  },
});

/**
 * Register Limiter (Prevents automated bot spam account creation)
 * Limits each IP to 5 account creations per 1 hour
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 accounts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again after an hour.',
    retryAfterMinutes: 60,
  },
});

/**
 * Password Reset Limiter (Prevents OTP / email spam bombing)
 * Limits each IP to 5 requests per 1 hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after an hour.',
    retryAfterMinutes: 60,
  },
});

/**
 * Global API Limiter
 * Limits each IP to 200 requests per 15 minutes
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down and try again shortly.',
  },
});

export default {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  globalLimiter,
};
