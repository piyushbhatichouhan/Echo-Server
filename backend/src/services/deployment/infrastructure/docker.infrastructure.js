const imageService = require("../../image.service");
const buildQueue = require("../../buildQueue.service");

const build = async (projectId, settings, callback, version = null) =>
  buildQueue.run(projectId, callback, async () => {
    return imageService.buildImage(projectId, settings, callback, version);
  });

const remove = async (projectId, version = null) => {
  try {
    await imageService.removeImage(imageService.getImageName(projectId, version));
  } catch {}
};

module.exports = {
  build,
  remove,
  getImageName: imageService.getImageName,
};

 