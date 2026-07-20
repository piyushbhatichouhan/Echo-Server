const { spawn } = require("child_process");
const { pool } = require("../config/database");
const runningProcesses = new Map();
const logStream = require("./log-stream.service");

const start = async (projectId, project) => {
  const child = spawn(project.start_command, {
    cwd: project.workspace,

    shell: true,

    env: project.environment,

    stdio: ["ignore", "pipe", "pipe"],
  });

  runningProcesses.set(projectId, child);

  child.stdout.on("data", (data) => {
    const message = data.toString();

    console.log(message);

    logStream.broadcast(projectId, message);
  });

  child.stderr.on("data", (data) => {
    const message = data.toString();

    console.error(message);

    logStream.broadcast(projectId, message);
  });

  child.on("exit", async () => {
    runningProcesses.delete(projectId);

    await pool.query(
      `
        UPDATE project_deployments
        SET

        status='stopped',

        process_id=NULL,

        updated_at=NOW()

        WHERE project_id=$1
        `,
      [projectId],
    );
  });

  return {
    pid: child.pid,

    child,
  };
};

const stop = async (projectId) => {
  const child = runningProcesses.get(projectId);

  if (!child) return;

  child.kill();

  runningProcesses.delete(projectId);

  await pool.query(
    `
UPDATE project_deployments
SET

status='stopped',

process_id=NULL,

updated_at=NOW()

WHERE project_id=$1
`,
    [projectId],
  );
};

const restart = async (projectId, project) => {
  await stop(projectId);

  return start(projectId, project);
};

const get = (projectId) => {
  return runningProcesses.get(projectId);
};

const isRunning = (projectId) => {
  return runningProcesses.has(projectId);
};

module.exports = {
  start,

  stop,

  restart,

  get,

  isRunning,
};
