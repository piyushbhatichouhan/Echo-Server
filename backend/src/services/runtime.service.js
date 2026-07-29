const { PRESETS } = require("../config/runtimePresets");

const getAvailableRuntimes = () => {
  return Object.entries(PRESETS).map(([key, value]) => ({
    id: key,
    displayName: value.displayName,
    description: value.description,
  }));
};

module.exports = {
  getAvailableRuntimes,
};
