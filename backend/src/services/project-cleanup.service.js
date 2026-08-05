const containerService = require("./container.service");
const imageService = require("./image.service");
const { removeProjectDirectory } = require("./file.service");
const routingService = require("../routing/routing.service");
const cleanupProject = async (projectId) => {
  //
  // Stop running container
  //
  try {
    await containerService.stopContainerByProject(projectId);
  } catch {}

  //
  // Remove container
  //
  try {
    await containerService.removeContainerByProject(projectId);
  } catch {}

  //
  // Remove docker image
  //
  try {
    await imageService.removeImage(imageService.getImageName(projectId));
  } catch {}

  //
  // Remove routing
  //
  try {
    console.log(`ProjectId: ${projectId}`);
    await routingService.unpublish({
      projectId,
    });
  } catch {}

  //
  // Delete project files
  //
  try {
    await removeProjectDirectory(projectId);
  } catch {}
};

module.exports = {
  cleanupProject,
};
