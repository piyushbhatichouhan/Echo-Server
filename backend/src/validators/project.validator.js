const { body } = require("express-validator");

const createProjectValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Project name must be between 3 and 100 characters"),

  body("description").optional().trim(),
];

const updateProjectValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Project name must be between 3 and 100 characters"),

  body("description").optional().trim(),

  body().custom((value) => {
    if (value.name === undefined && value.description === undefined) {
      throw new Error("At least one field must be provided");
    }

    return true;
  }),
];

module.exports = {
  createProjectValidation,
  updateProjectValidation,
};
