const runtimeResolver = require("./deployment/runtimeResolver");

const buildRuntimeEnvironment = (project, settings) => {
  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  return [
    {
      key: "PORT",
      value: runtime.INTERNAL_PORT.toString(),
    },
  ];
};

module.exports = {
  buildRuntimeEnvironment,
};
