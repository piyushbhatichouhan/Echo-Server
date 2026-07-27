const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const errors = {};

  result.array().forEach((error) => {
    if (!errors[error.path]) {
      errors[error.path] = error.msg;
    }
  });

  return res.status(400).json({
    success: false,
    message: Object.values(errors)[0], // First validation error
    errors,
  });
};

module.exports = validate;
