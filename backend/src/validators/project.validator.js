const { body } = require("express-validator");
const { pool } = require("../config/database");

const createProjectValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Project name must be between 3 and 100 characters")
    .custom(async (value, { req }) => {
      const ownerId = req.user?.id;
      if (!ownerId || !value) return true;
      const existing = await pool.query(
        "SELECT id FROM projects WHERE owner_id = $1 AND LOWER(TRIM(name)) = LOWER($2) LIMIT 1",
        [ownerId, value.trim()],
      );
      if (existing.rows.length > 0) {
        throw new Error(`A project named "${value.trim()}" already exists in your account.`);
      }
      return true;
    }),

  body("description").optional().trim(),
];

const updateProjectValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Project name must be between 3 and 100 characters")
    .custom(async (value, { req }) => {
      const ownerId = req.user?.id;
      const projectId = req.params?.id || req.params?.projectId;
      if (!ownerId || !value) return true;
      const existing = await pool.query(
        "SELECT id FROM projects WHERE owner_id = $1 AND id != $2 AND LOWER(TRIM(name)) = LOWER($3) LIMIT 1",
        [ownerId, projectId, value.trim()],
      );
      if (existing.rows.length > 0) {
        throw new Error(`A project named "${value.trim()}" already exists in your account.`);
      }
      return true;
    }),

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
