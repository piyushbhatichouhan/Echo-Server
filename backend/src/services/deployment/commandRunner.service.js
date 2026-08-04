const { spawn } = require("child_process");
const runtime = require("../../config/runtime");

function normalizeCommand(command) {
  if (process.platform !== "win32") {
    command = command.replace(/^python(\s|$)/, `${runtime.python}$1`);
    command = command.replace(/^pip(\s|$)/, `${runtime.pip}$1`);
  }

  return command;
}

const runCommand = ({ command, cwd, env = {} }) => {
  return new Promise((resolve) => {
    const normalizedCommand = normalizeCommand(command);

    const child = spawn(normalizedCommand, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        ...env,
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr: error.message,
      });
    });
  });
};

module.exports = {
  runCommand,
};
