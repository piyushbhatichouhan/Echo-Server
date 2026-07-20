const { spawn } = require("child_process");
const logStream = require("./log-stream.service");
const MAX_LOG_BUFFER = 64 * 1024;

const appendBuffer = (buffer, chunk) => {
  buffer += chunk;

  if (buffer.length > MAX_LOG_BUFFER) {
    buffer = buffer.slice(-MAX_LOG_BUFFER);
  }

  return buffer;
};

const runCommand = (
  projectId,
  command,
  workingDirectory,
  environment = process.env,
) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: workingDirectory,
      shell: true,
      env: environment,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const message = data.toString();

      stdout = appendBuffer(stdout, message);

      if (projectId) {
        logStream.broadcast(projectId, message);
      }
    });

    child.stderr.on("data", (data) => {
      const message = data.toString();

      stderr = appendBuffer(stderr, message);

      if (projectId) {
        logStream.broadcast(projectId, message);
      }
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          code,
          stdout,
          stderr,
        });
      } else {
        reject(new Error(stderr || `Command exited with code ${code}`));
      }
    });
  });
};

module.exports = {
  runCommand,
};
