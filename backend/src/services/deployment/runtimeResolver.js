const node = require("./runtimes/node.runtime");
const python = require("./runtimes/python.runtime");
const custom = require("./runtimes/custom.runtime");
const statik = require("./runtimes/static.runtime");
const buildpack = require("./runtimes/buildpack.runtime");

const handlers = {
  node,
  python,
  custom,
  static: statik,
  buildpack,
  go: buildpack,
  rust: buildpack,
  bun: buildpack,
  php: buildpack,
  ruby: buildpack,
  java: buildpack,
  docker: buildpack,
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
