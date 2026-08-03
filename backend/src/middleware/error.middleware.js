const errorHandler = (err, req, res, next) => {
  console.error(err);

  const response = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  if (err.code) {
    response.code = err.code;
  }

  if (err.email) {
    response.email = err.email;
  }

  res.status(err.status || 500).json(response);
};

module.exports = errorHandler;
