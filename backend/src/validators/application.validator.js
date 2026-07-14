const { body } = require("express-validator");

const saveApplicationValidation = [
  body("runtime")
    .trim()
    .notEmpty()
    .withMessage("Runtime is required")
    .isIn(["node"])
    .withMessage("Invalid runtime"),

  body("entryFile")
    .trim()
    .notEmpty()
    .withMessage("Entry file is required")
    .isLength({ max: 255 })
    .withMessage("Entry file is too long")
    .matches(/\.js$/)
    .withMessage("Entry file must be a .js file"),

  body("buildCommand")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Build command is too long"),

  body("startCommand")
    .trim()
    .notEmpty()
    .withMessage("Start command is required")
    .isLength({ max: 500 })
    .withMessage("Start command is too long"),

  body("workingDirectory")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Working directory is too long"),
];

module.exports = {
  saveApplicationValidation,
};
