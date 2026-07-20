const NodeRuntime = require("./node/NodeRuntime");

const getRuntime = (runtime) => {
  switch (runtime) {
    case "node":
      return new NodeRuntime();

    default:
      throw new Error(`Unsupported runtime: ${runtime}`);
  }
};

module.exports = {
  getRuntime,
};
