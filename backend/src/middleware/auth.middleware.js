const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

/**
 * Checks whether the incoming request is permitted to authenticate via ?token= query parameter.
 * Query tokens are strictly limited to dedicated streaming (SSE) and direct browser downloads
 * where standard Authorization headers cannot be supplied by native browser APIs (such as EventSource).
 */
const isAllowedQueryTokenEndpoint = (req) => {
  const rawPath = (req.originalUrl || req.url || req.path || "")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  const method = (req.method || "GET").toUpperCase();

  // 1. Dedicated SSE live log stream (native browser EventSource cannot send custom headers)
  if (rawPath.endsWith("/logs/live") || req.headers.accept?.includes("text/event-stream")) {
    return true;
  }

  // 2. Direct browser GET downloads or content stream
  if (method === "GET" && (rawPath.endsWith("/download") || rawPath.endsWith("/content"))) {
    return true;
  }

  return false;
};

const authenticate = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1]?.trim();
  } else if (req.query?.token) {
    if (isAllowedQueryTokenEndpoint(req)) {
      token = typeof req.query.token === "string" ? req.query.token.trim() : null;
    } else {
      return res.status(401).json({
        success: false,
        message:
          "Authentication via URL query parameters is disabled for security reasons. Please use the 'Authorization: Bearer <token>' header.",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fast indexed check to ensure user still exists and is not disabled or pending deletion
    const { rows } = await pool.query(
      `SELECT id, username, email, is_owner, disabled, pending_deletion, can_custom_subdomain, status FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });
    }

    const user = rows[0];

    if (user.disabled) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Please contact the administrator.",
      });
    }

    if (user.pending_deletion) {
      return res.status(403).json({
        success: false,
        message: "Your account is scheduled for deletion.",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your registration request was rejected.",
      });
    }

    // Attach fresh user details and live permissions
    req.user = {
      ...decoded,
      username: user.username,
      email: user.email,
      is_owner: Boolean(user.is_owner),
      isOwner: Boolean(user.is_owner),
      can_custom_subdomain: Boolean(user.is_owner || user.can_custom_subdomain),
      canCustomSubdomain: Boolean(user.is_owner || user.can_custom_subdomain),
      disabled: Boolean(user.disabled),
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    return next(error);
  }
};

module.exports = authenticate;
