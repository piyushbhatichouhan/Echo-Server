const applicationRepository = require("../repositories/application.repository");

const { verifyProjectOwnership } = require("./project.service");

const saveApplication = async (projectId, ownerId, application) => {
  await verifyProjectOwnership(projectId, ownerId);

  const existing =
    await applicationRepository.getApplicationByProjectId(projectId);

  if (existing) {
    return await applicationRepository.updateApplication(
      projectId,
      application,
    );
  }

  return await applicationRepository.createApplication(projectId, application);
};

// We'll add these next
const getApplication = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const app = await applicationRepository.getApplicationByProjectId(projectId);

  if (!app) return null;

  return {
    id: app.id,
    projectId: app.project_id,
    runtime: app.runtime,
    entryFile: app.entry_file,
    buildCommand: app.build_command,
    startCommand: app.start_command,
    workingDirectory: app.working_directory,
  };
};

const deleteApplication = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const application =
    await applicationRepository.getApplicationByProjectId(projectId);

  if (!application) {
    const error = new Error("Application not found");
    error.status = 404;
    throw error;
  }

  await applicationRepository.deleteApplication(projectId);

  return {
    message: "Application deleted successfully",
  };
};

module.exports = {
  saveApplication,
  getApplication,
  deleteApplication,
};
