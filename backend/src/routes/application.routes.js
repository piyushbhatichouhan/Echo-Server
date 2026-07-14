const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");

const {
  saveApplicationValidation,
} = require("../validators/application.validator");

const {
  saveApplication,
  getApplication,
  deleteApplication,
} = require("../controllers/application.controller");

router.put(
  "/projects/:id/application",
  authenticate,
  saveApplicationValidation,
  validate,
  saveApplication,
);

router.get("/projects/:id/application", authenticate, getApplication);

router.delete("/projects/:id/application", authenticate, deleteApplication);

module.exports = router;
