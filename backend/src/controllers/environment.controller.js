const {
  createEnvironmentVariable,
} = require("../services/environment.service");

const {
  getEnvironmentVariables,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
} = require("../services/environment.service");

const environmentService = require("../services/environment.service");

const createVariable = async (req, res, next) => {
  try {
    const variable = await environmentService.createEnvironmentVariable(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Environment variable created successfully",
      data: variable,
    });
  } catch (error) {
    next(error);
  }
};

const getVariables = async (req, res, next) => {
  try {
    const variables = await getEnvironmentVariables(req.params.id, req.user.id);

    res.json({
      success: true,
      data: variables,
    });
  } catch (err) {
    next(err);
  }
};

const updateVariable = async (req, res, next) => {
  try {
    const variable = await updateEnvironmentVariable(
      req.params.id,
      req.params.variableId,
      req.user.id,
      req.body,
    );

    res.json({
      success: true,
      data: variable,
    });
  } catch (err) {
    next(err);
  }
};

const deleteVariable = async (req, res, next) => {
  try {
    await deleteEnvironmentVariable(
      req.params.id,
      req.params.variableId,
      req.user.id,
    );

    res.json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVariables,
  deleteVariable,
  updateVariable,
  createVariable,
};
