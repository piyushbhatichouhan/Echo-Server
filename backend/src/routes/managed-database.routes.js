const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const managedDbController = require("../controllers/managed-database.controller");

router.get(
  "/projects/:projectId/databases",
  authenticate,
  managedDbController.listDatabasesController,
);

router.post(
  "/projects/:projectId/databases",
  authenticate,
  managedDbController.provisionDatabaseController,
);

router.post(
  "/projects/:projectId/databases/:databaseId/start",
  authenticate,
  managedDbController.startDatabaseController,
);

router.post(
  "/projects/:projectId/databases/:databaseId/stop",
  authenticate,
  managedDbController.stopDatabaseController,
);

router.delete(
  "/projects/:projectId/databases/:databaseId",
  authenticate,
  managedDbController.deleteDatabaseController,
);

module.exports = router;

