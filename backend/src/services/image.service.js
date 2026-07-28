const tar = require("tar-fs");
const docker = require("../docker/docker.client");
const workspace = require("./workspace.service");
const buildContext = require("./build-context.service");

const getImageName = (projectId) => {
  return `echohub-${projectId}`;
};

const buildImage = async (projectId, settings, log) => {
  console.log("Starting build...");

  const buildPath = await buildContext.prepareBuildContext(projectId, settings);

  console.log("Build context:", buildPath);
  await log("Build context:", buildPath);
  const tarStream = tar.pack(buildPath, {
    ignore: (name) => {
      console.log("Packing:", name);
      return false;
    },
  });

  const imageName = getImageName(projectId);

  console.log("Building image:", imageName);
  await log("Building image:", imageName);
  const fs = require("fs/promises");

  console.log("Build files:", await fs.readdir(buildPath));
  await log("Build files:", await fs.readdir(buildPath));

  const stream = await docker.buildImage(tarStream, {
    t: imageName,
  });

  console.log("Docker build started");
  await log("Docker build started");
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, output) => {
        if (err) {
          console.error("Docker build failed:", err);

          reject(err);
        } else {
          console.log("Docker build completed");

          resolve(output);
        }
      },
      async (event) => {
        console.log(JSON.stringify(event));

        if (log) return;

        if (event.stream) {
          await log(event.stream.trim());
        }

        if (event.error) {
          await log(`ERROR: ${event.error}`);
        }
      },
    );
  });

  console.log("Returning image:", imageName);
  await log("Returning image:", imageName);
  return imageName;
};

const removeImage = async (imageName) => {
  const image = docker.getImage(imageName);

  await image.remove({
    force: true,
  });
};

module.exports = {
  buildImage,
  getImageName,
  removeImage,
};
