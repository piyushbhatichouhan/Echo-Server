const commandRunner = require("../commandRunner.service");

const runCommand = async ({ cwd, command }) => {
  return commandRunner.runCommand({
    cwd,
    command,
  });
};

module.exports = {
  runCommand,
};
