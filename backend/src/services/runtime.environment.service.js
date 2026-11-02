const runtimeResolver = require("./deployment/runtimeResolver");

const buildRuntimeEnvironment = (project, settings, resolvedPort) => {
  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);
  const port = (
    resolvedPort ||
    Number(settings?.port) ||
    runtime.INTERNAL_PORT
  ).toString();

  const env = [
    {
      key: "PORT",
      value: port,
    },
  ];

  if (settings.runtime === "node") {
    env.push({
      key: "NODE_ENV",
      value: "production",
    });
  }

  return env;
};

module.exports = {
  buildRuntimeEnvironment,
};
