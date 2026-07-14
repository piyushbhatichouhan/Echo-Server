const { body } = require("express-validator");

const createEnvironmentVariableValidation = [
  body("key")
    .trim()
    .notEmpty()
    .withMessage("Key is required")
    .isLength({ max: 100 })
    .withMessage("Key cannot exceed 100 characters")
    .matches(/^[A-Z0-9_]+$/)
    .withMessage(
      "Key may only contain uppercase letters, numbers and underscores",
    ),

  body("value").notEmpty().withMessage("Value is required"),

  body("secret")
    .optional()
    .isBoolean()
    .withMessage("Secret must be true or false"),
];

module.exports = {
  createEnvironmentVariableValidation,
};
