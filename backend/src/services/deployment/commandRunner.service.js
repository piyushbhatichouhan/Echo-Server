const { spawn } = require("child_process");

const runCommand = ({ command, cwd, env = {} }) => {
  return new Promise((resolve) => {
    const child = spawn(command, {
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
