const tar = require("tar-fs");
const docker = require("../docker/docker.client");
const workspace = require("./workspace.service");
const buildContext = require("./build-context.service");

const getImageName = (projectId, version = null) => {
  return version ? `echohub-${projectId}:${version}` : `echohub-${projectId}`;
};

const buildImage = async (projectId, settings, log, version = null) => {
  console.log("Starting build...");

  const buildPath = await buildContext.prepareBuildContext(
    projectId,
    settings.dockerfile,
  );

  console.log("Build context:", buildPath);
  await log(`Build context: ${buildPath}`);
  const tarStream = tar.pack(buildPath, {
    ignore: (name) => {
      console.log("Packing:", name);
      return false;
    },
  });

  const imageName = getImageName(projectId, version);

  console.log("Building image:", imageName);

  await log(`Building Docker container: ${imageName}`);

  const stream = await docker.buildImage(tarStream, {
    t: imageName,
  });

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,

      (err, output) => {
        if (err) {
          return reject(err);
        }

        const buildError = output.find((event) => event.error);

        if (buildError) {
          return reject(new Error(buildError.error));
        }

        resolve(output);
      },

      async (event) => {
        if (log && event.stream) {
          const trimmed = event.stream.trim();
          if (trimmed) {
            await log(trimmed);
          }
        }

        if (log && event.error) {
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
