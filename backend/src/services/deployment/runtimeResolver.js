const node = require("./runtimes/node.runtime");
const python = require("./runtimes/python.runtime");
const custom = require("./runtimes/custom.runtime");
const statik = require("./runtimes/static.runtime");

const handlers = {
  node,
  python,
  custom,
  static: statik,
};

const getRuntimeHandler = (runtime) => {
  const handler = handlers[runtime];

  if (!handler) {
    throw new Error(`Unsupported runtime there: ${runtime}`);
  }

  return handler;
};

module.exports = {
  getRuntimeHandler,
};
