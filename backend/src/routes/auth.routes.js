const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { register } = require("../controllers/auth.controller");
const {
  registerValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../validators/auth.validator");
const validate = require("../middleware/validation.middleware");
const authenticate = require("../middleware/auth.middleware");
const { me } = require("../controllers/auth.controller");
const {
  verify,
  resendVerification,
} = require("../controllers/auth.controller");
const {
  forgotPassword,
  resetPassword,
  validateResetToken,
  deleteAccount,
} = require("../controllers/auth.controller");
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
} = require("../middleware/rateLimit.middleware");

router.post("/register", registerLimiter, registerValidation, validate, register);
router.post("/login", loginLimiter, login);
router.get("/me", authenticate, me);
router.get("/verify-email", verify);
router.post("/resend-verification", resendVerificationLimiter, resendVerification);
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordValidation, validate, forgotPassword);
router.put("/reset-password", resetPasswordValidation, validate, resetPassword);
router.get("/reset-password/validate", validateResetToken);
router.delete("/account", authenticate, deleteAccount);

module.exports = router;
