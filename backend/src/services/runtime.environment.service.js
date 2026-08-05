const buildRuntimeEnvironment = (project, settings) => {
  return [
    {
      key: "PORT",
      value: settings.port.toString(),
    },
  ];
};

module.exports = {
  buildRuntimeEnvironment,
};
