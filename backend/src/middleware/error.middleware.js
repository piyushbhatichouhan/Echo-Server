const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = Number(err.status) || 500;

  // Dispatch critical alert email for unexpected internal server errors (500+)
  if (statusCode >= 500) {
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
  const safeMessage =
    statusCode >= 500 && isProduction
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
