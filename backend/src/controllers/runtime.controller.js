const runtimeService = require("../services/runtime.service");

const getAvailableRuntimes = (req, res) => {
  res.json({
    success: true,
    data: runtimeService.getAvailableRuntimes(),
  });
};

module.exports = {
  getAvailableRuntimes,
};
