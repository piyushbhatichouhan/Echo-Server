const managedDbService = require("../services/managed-database.service");

const listDatabasesController = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const databases = await managedDbService.listDatabases(
      projectId,
      req.user.id,
    );
    res.json({ success: true, data: databases });
  } catch (err) {
    next(err);
  }
};

const provisionDatabaseController = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const database = await managedDbService.provisionDatabase(
      projectId,
      req.user.id,
      req.body,
    );
    res.status(201).json({
      success: true,
      data: database,
      message: `Managed ${database.engine} instance '${database.name}' provisioned successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

const startDatabaseController = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const databaseId = req.params.databaseId;
    const database = await managedDbService.startDatabase(
      projectId,
      databaseId,
      req.user.id,
    );
    res.json({
      success: true,
      data: database,
      message: `Database '${database.name}' started.`,
    });
  } catch (err) {
    next(err);
  }
};

const stopDatabaseController = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const databaseId = req.params.databaseId;
    const database = await managedDbService.stopDatabase(
      projectId,
      databaseId,
      req.user.id,
    );
    res.json({
      success: true,
      data: database,
      message: `Database '${database.name}' stopped.`,
    });
  } catch (err) {
    next(err);
  }
};

const deleteDatabaseController = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const databaseId = req.params.databaseId;
    const result = await managedDbService.deleteDatabase(
      projectId,
      databaseId,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDatabasesController,
  provisionDatabaseController,
  startDatabaseController,
  stopDatabaseController,
  deleteDatabaseController,
};

