const { body } = require("express-validator");
const { validateUsernameReservation } = require("../publication/reservedHostnames");

const registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, hyphens, and underscores",
    )
    .custom((val) => {
      const reservation = validateUsernameReservation(val, false);
      if (!reservation.valid) {
        throw new Error(reservation.error);
      }
      return true;
    }),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),
];

const resetPasswordValidation = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid reset token format"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

const updateUsernameValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, hyphens, and underscores",
    )
    .custom((val, { req }) => {
      const isOwner = Boolean(req.user?.is_owner);
      const reservation = validateUsernameReservation(val, isOwner);
      if (!reservation.valid) {
        throw new Error(reservation.error);
      }
      return true;
    }),
];

module.exports = {
  registerValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateUsernameValidation,
};
