const {
  createEnvironmentVariable,
} = require("../services/environment.service");

const createVariable = async (req, res, next) => {
  try {
    const variable = await createEnvironmentVariable(
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

module.exports = {
  createVariable,
};
