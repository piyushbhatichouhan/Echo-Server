const fs = require("fs/promises");
const path = require("path");

const workspace = require("./workspace.service");
const fileService = require("./file.service");

const prepareBuildContext = async (projectId, dockerfileContent) => {
  const filesPath = workspace.getFilesPath(projectId);
  const buildPath = workspace.getBuildPath(projectId);

  await workspace.ensureWorkspace(projectId);

  await fs.rm(buildPath, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(buildPath, {
    recursive: true,
  });

  const files = await fileService.getProjectFilesForBuild(projectId);

  for (const file of files) {
    if (file.is_directory) continue;

    const destination = path.join(buildPath, file.relative_path);

    await fs.mkdir(path.dirname(destination), {
      recursive: true,
    });

    await fs.copyFile(file.storage_path, destination);
  }

  const dockerfilePath = path.join(buildPath, "Dockerfile");

  await fs.writeFile(dockerfilePath, dockerfileContent);

  return buildPath;
};

module.exports = {
  prepareBuildContext,
};
