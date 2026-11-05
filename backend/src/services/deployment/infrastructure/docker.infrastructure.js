const imageService = require("../../image.service");
const buildQueue = require("../../buildQueue.service");

const build = async (projectId, settings, callback) =>
  buildQueue.run(projectId, callback, async () => {
    return imageService.buildImage(projectId, settings, callback);
  });

const remove = async (projectId) => {
  try {
    await imageService.removeImage(imageService.getImageName(projectId));
  } catch {}
};

module.exports = {
  build,
  remove,
  getImageName: imageService.getImageName,
};

 