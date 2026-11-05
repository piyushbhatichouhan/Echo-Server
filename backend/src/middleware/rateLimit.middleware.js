const { rateLimit } = require("express-rate-limit");

/**
 * Brute-force protection for user login.
 * Allows up to 10 failed login attempts per 15-minute window per IP.
 * Successful logins do not count against the limit.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 attempts per IP per window
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: true, // Only failed logins count toward brute-force threshold
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many login attempts from this IP. Please try again after 15 minutes.",
      retryAfterMinutes: 15,
    });
  },
});

/**
 * Protection against mass account registration and bot spam.
 * Allows up to 5 registrations per 1-hour window per IP.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // Max 5 account registrations per IP per hour
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many accounts created from this IP. Please try again in an hour.",
      retryAfterMinutes: 60,
    });
  },
});

/**
 * Protection against password reset spamming and email flooding.
 * Allows up to 5 password reset requests per 1-hour window per IP.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // Max 5 reset requests per IP per hour
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many password reset requests from this IP. Please try again in an hour.",
      retryAfterMinutes: 60,
    });
  },
});

/**
 * Protection against email verification resend flooding.
 * Allows up to 5 requests per 15-minute window per IP.
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Max 5 resend requests per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many email verification requests from this IP. Please wait a few minutes before trying again.",
      retryAfterMinutes: 15,
    });
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
};
