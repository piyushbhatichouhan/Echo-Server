const tar = require("tar-fs");
const docker = require("../docker/docker.client");
const workspace = require("./workspace.service");
const buildContext = require("./build-context.service");

const getImageName = (projectId, version = null) => {
  return version ? `echoserver-${projectId}:${version}` : `echoserver-${projectId}`;
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

  const BUILD_TIMEOUT_MS =
    Number(process.env.DOCKER_BUILD_TIMEOUT_MS) || 10 * 60 * 1000;

  await new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        if (typeof stream.destroy === "function") stream.destroy();
      } catch {}
      const timeoutErr = new Error(
        `Docker build timed out after ${Math.round(BUILD_TIMEOUT_MS / 1000)} seconds`,
      );
      timeoutErr.status = 408;
      timeoutErr.isUserError = true;
      timeoutErr.isBuildError = true;
      reject(timeoutErr);
    }, BUILD_TIMEOUT_MS);

    docker.modem.followProgress(
      stream,

      (err, output) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (err) {
          err.status = err.status || 400;
          err.isUserError = true;
          err.isBuildError = true;
          return reject(err);
        }

        const buildError = output.find((event) => event.error);

        if (buildError) {
          const bErr = new Error(buildError.error);
          bErr.status = 400;
          bErr.isUserError = true;
          bErr.isBuildError = true;
          return reject(bErr);
        }

        resolve(output);
      },

      async (event) => {
        if (finished) return;

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
  if (!imageName) return;
  try {
    const image = docker.getImage(imageName);
    await image.remove({
      force: true,
    });
  } catch (err) {
    // Gracefully handle if image does not exist
    if (err.statusCode !== 404 && !err.message?.includes("404")) {
      console.warn(`[ImageService] Could not remove image ${imageName}:`, err.message);
    }
  }
};

module.exports = {
  buildImage,
  getImageName,
  removeImage,
};
