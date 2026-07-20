const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const validate = require("../middleware/validation.middleware");

const environmentController = require("../controllers/environment.controller");

const {
  createEnvironmentVariableValidation,
} = require("../validators/environment.validator");

router.get(
  "/projects/:id/environment",
  authenticate,
  environmentController.getVariables,
);

router.post(
  "/projects/:id/environment",
  authenticate,
  createEnvironmentVariableValidation,
  validate,
  environmentController.createVariable,
);

router.patch(
  "/projects/:id/environment/:variableId",
  authenticate,
  environmentController.updateVariable,
);

router.delete(
  "/projects/:id/environment/:variableId",
  authenticate,
  environmentController.deleteVariable,
);

module.exports = router;
