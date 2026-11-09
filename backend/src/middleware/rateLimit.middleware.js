const { rateLimit } = require("express-rate-limit");

/**
 * Brute-force protection for user login.
 * Allows up to 25 failed login attempts per 15-minute window per IP.
 * Successful logins do not count against the limit.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many login attempts from this IP. Please try again after a few minutes.",
      retryAfterMinutes: 15,
    });
  },
});

/**
 * Protection against mass account registration and bot spam.
 * Allows up to 20 registrations per 1-hour window per IP.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many accounts created from this IP. Please try again later.",
      retryAfterMinutes: 60,
    });
  },
});

/**
 * Protection against password reset spamming and email flooding.
 * Allows up to 15 password reset requests per 1-hour window per IP.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: Number(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX) || 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many password reset requests from this IP. Please try again later.",
      retryAfterMinutes: 60,
    });
  },
});

/**
 * Protection against email verification resend flooding.
 * Allows up to 15 requests per 15-minute window per IP.
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.RATE_LIMIT_RESEND_VERIFY_MAX) || 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many email verification requests. Please wait a few minutes before trying again.",
      retryAfterMinutes: 15,
    });
  },
});

/**
 * General API DDoS and flooding protection.
 * Allows up to 3,000 requests per 15-minute window per IP (~200 req/min).
 * Skips CORS preflight (OPTIONS), health checks, and persistent SSE log streams.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.RATE_LIMIT_API_MAX) || 3000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) =>
    req.method === "OPTIONS" ||
    req.path === "/health" ||
    req.path.endsWith("/logs/live") ||
    (req.originalUrl && req.originalUrl.includes("/logs/live")) ||
    Boolean(req.headers.accept && req.headers.accept.includes("text/event-stream")),
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "API rate limit exceeded. Please wait a moment and try again.",
      retryAfterMinutes: 15,
    });
  },
});

/**
 * Deployment abuse and container build spam protection.
 * Allows up to 30 deployment triggers per 5-minute window per IP.
 */
const deploymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: Number(process.env.RATE_LIMIT_DEPLOY_MAX) || 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many deployment requests in a short time. Please wait a few minutes before triggering another deployment.",
      retryAfterMinutes: 5,
    });
  },
});

/**
 * Interactive container terminal command flood protection.
 * Allows up to 180 terminal commands per 1-minute window per IP (~3/sec).
 */
const terminalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: Number(process.env.RATE_LIMIT_TERMINAL_MAX) || 180,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Terminal command rate limit exceeded. Please wait a few seconds before executing more commands.",
      retryAfterSeconds: 60,
    });
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  apiLimiter,
  deploymentLimiter,
  terminalLimiter,
};
