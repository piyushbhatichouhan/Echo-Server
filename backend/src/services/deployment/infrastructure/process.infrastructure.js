const commandRunner = require("../commandRunner.service");

const runCommand = async ({ cwd, command, env }) => {
  return commandRunner.runCommand({
    cwd,
    command,
    env,
  });
};

module.exports = {
  runCommand,
};
