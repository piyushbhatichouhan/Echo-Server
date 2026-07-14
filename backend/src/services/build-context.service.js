const fs = require("fs/promises");
const path = require("path");

const workspace = require("./workspace.service");
const fileService = require("./file.service");

const prepareBuildContext = async (projectId, application) => {
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
    await fs.copyFile(
      path.join(filesPath, file.stored_name),
      path.join(buildPath, file.original_name),
    );
  }

  const dockerfilePath = path.join(buildPath, "Dockerfile");

  const buildCommand = application.buildCommand || "npm install";
  const startCommand =
    application.startCommand || `node ${application.entryFile}`;

  const dockerfile = `
FROM node:22-alpine

WORKDIR /app

COPY . .

RUN ${buildCommand}

EXPOSE 3000

CMD ["sh", "-c", "${startCommand}"]
`;

  await fs.writeFile(dockerfilePath, dockerfile);

  return buildPath;
};

module.exports = {
  prepareBuildContext,
};
