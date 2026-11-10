/**
 * Determines whether an error originated from a user's project, custom build,
 * Dockerfile, application code, git repository, or client input rather than
 * a critical server infrastructure failure.
 */
const isUserOrDeploymentError = (err, req) => {
  if (err?.isUserError || err?.userFacing || err?.isBuildError) {
    return true;
  }

  const rawStatus = Number(err?.status);
  if (rawStatus >= 400 && rawStatus < 500) {
    return true;
  }

  const rawUrl = req?.originalUrl || req?.url || "";
  const isUserProjectRoute =
    rawUrl.includes("/api/projects/") ||
    rawUrl.includes("/api/deployments") ||
    rawUrl.includes("/api/git");

  const msg = String(err?.message || err || "").toLowerCase();

  const userErrorKeywords = [
    "returned a non-zero code",
    "copy failed",
    "file not found in build context",
    "file does not exist",
    "no such file or directory",
    "no dockerfile",
    "dockerfile not found",
    "failed to solve with frontend",
    "failed to compute cache key",
    "docker build timed out",
    "exited prematurely",
    "did not respond to http probe",
    "simple-git",
    "repository not connected",
    "invalid github repository",
    "not a git repository",
    "merge conflict",
    "git clone",
    "git pull",
    "git push",
    "authentication failed",
    "could not read username",
    "remote branch",
    "npm err!",
    "yarn error",
    "pnpm",
    "corepack",
    "command not found",
    ": not found",
    "modulenotfounderror",
    "cannot find module",
    "syntaxerror",
    "pip install",
    "requirements.txt",
    "working directory",
    "target deployment not found",
    "project not found",
  ];

  if (userErrorKeywords.some((keyword) => msg.includes(keyword))) {
    return true;
  }

  // If the error occurred on a project action route and isn't a platform infrastructure failure
  if (isUserProjectRoute) {
    const isInfrastructureError =
      msg.includes("econnrefused") ||
      msg.includes("connect enoent") ||
      msg.includes("docker daemon") ||
      rawStatus === 503 || // Host memory circuit breaker
      rawStatus === 507; // Host disk circuit breaker

    if (!isInfrastructureError) {
      return true;
    }
  }

  return false;
};

const errorHandler = (err, req, res, next) => {
  console.error(err);

  const isUserError = isUserOrDeploymentError(err, req);

  // If it's a user project or deployment error, normalize status code to 400 (or its 4xx status)
  let statusCode = Number(err.status) || 500;
  if (isUserError && (statusCode >= 500 || !err.status)) {
    statusCode = 400;
  }

  // Dispatch critical alert email ONLY for genuine unexpected internal server errors (500+)
  // User project, deployment, build, runtime, and git errors are never emailed to SuperAdmin
  if (statusCode >= 500 && !isUserError) {
    try {
      const notificationService = require("../services/notification.service");
      notificationService
        .notifyCriticalError({
          error: err,
          source: `Express API Error (${statusCode})`,
          req,
        })
        .catch((mailErr) => {
          console.warn("[ErrorMiddleware] Notification alert dispatch warning:", mailErr.message);
        });
    } catch (_) {}
  }

  const isProduction = process.env.NODE_ENV === "production";
  // Always surface actual error message for user/deployment errors so developers can troubleshoot
  const safeMessage =
    statusCode >= 500 && isProduction && !isUserError
      ? "An internal server error occurred. Our team has been notified."
      : err.message || "Internal Server Error";

  const response = {
    success: false,
    message: safeMessage,
  };

  if (err.code) {
    response.code = err.code;
  }

  if (err.email) {
    response.email = err.email;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
module.exports.isUserOrDeploymentError = isUserOrDeploymentError;
