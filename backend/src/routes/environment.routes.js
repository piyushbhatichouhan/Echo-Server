const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const validate = require("../middleware/validation.middleware");

const { createVariable } = require("../controllers/environment.controller");

const {
  createEnvironmentVariableValidation,
} = require("../validators/environment.validator");

router.post(
  "/projects/:id/environment",
  authenticate,
  createEnvironmentVariableValidation,
  validate,
  createVariable,
);

module.exports = router;
