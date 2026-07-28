const fs = require("fs/promises");
const path = require("path");

const workspace = require("./workspace.service");
const fileService = require("./file.service");

const prepareBuildContext = async (projectId, settings) => {
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

  const buildCommand = settings.build_command || "npm install";

  const startCommand = settings.start_command || "npm start";

  const dockerfile = `
FROM node:22-alpine

WORKDIR /app

COPY . .

${buildCommand ? `RUN ${buildCommand}` : ""}

EXPOSE 3000

CMD ["sh", "-c", "${startCommand}"]
`;

  await fs.writeFile(dockerfilePath, dockerfile);

  return buildPath;
};

module.exports = {
  prepareBuildContext,
};
