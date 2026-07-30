const imageService = require("../../image.service");

const build = async (projectId, settings, callback) =>
  imageService.buildImage(projectId, settings, callback);

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
