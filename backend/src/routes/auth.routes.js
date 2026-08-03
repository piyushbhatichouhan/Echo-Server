const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { register } = require("../controllers/auth.controller");
const { registerValidation } = require("../validators/auth.validator");
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

router.post("/register", registerValidation, validate, register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.get("/verify-email", verify);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);
router.get("/reset-password/validate", validateResetToken);
router.delete("/account", authenticate, deleteAccount);

module.exports = router;
