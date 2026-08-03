const { registerUser } = require("../services/auth.service");
const { loginUser } = require("../services/auth.service");
const { getCurrentUser } = require("../services/auth.service");
const { verifyEmail } = require("../services/auth.service");
const { resendVerificationEmail } = require("../services/auth.service");
const {
  forgotPasswordUser,
  resetPasswordUser,
} = require("../services/auth.service");
const { validateResetPasswordToken } = require("../services/auth.service");
const { deleteOwnAccount } = require("../services/auth.service");

const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const { token } = req.query;

    await verifyEmail(token);

    res.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    await resendVerificationEmail(email);

    res.json({
      success: true,
      message: "Verification email sent.",
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    await forgotPasswordUser(email);

    res.json({
      success: true,
      message: "If an account exists, a password reset email has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    await resetPasswordUser(token, password);

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    next(err);
  }
};

const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.query;

    await validateResetPasswordToken(token);

    res.json({
      success: true,
      valid: true,
    });
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    await deleteOwnAccount(req.user.id);

    res.json({
      success: true,
      message: "Account scheduled for deletion.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  verify,
  resendVerification,
  forgotPassword,
  resetPassword,
  validateResetToken,
  deleteAccount,
};
