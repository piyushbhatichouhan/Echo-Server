const { runCommand } = require("../../services/deploymentRunner.service");

const processManager = require("../../services/processManager.service");

class NodeRuntime {
  async install(project) {
    return runCommand(
      project.projectId,
      project.install_command,
      project.workspace,
      project.environment,
    );
  }

  async build(project) {
    return runCommand(
      project.projectId,
      project.install_command,
      project.workspace,
      project.environment,
    );
  }

  async start(projectId, project) {
    return processManager.start(projectId, project);
  }

  async stop(projectId) {
    return processManager.stop(projectId);
  }

  async restart(projectId, project) {
    return processManager.restart(projectId, project);
  }
}

module.exports = NodeRuntime;
