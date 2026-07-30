const runtimeResolver = require("./runtimeResolver");

const deployProject = async (project, settings) => {
  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  if (!runtime) {
    throw new Error("Unsupported runtime.");
  }

  return await runtime.deploy(project, settings);
};

module.exports = {
  deployProject,
};
