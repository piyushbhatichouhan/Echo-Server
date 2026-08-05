const publicationService = require("./publication.service");

const publishProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    const publication = await publicationService.publishProject(
      projectId,
      ownerId,
    );

    res.status(201).json({
      success: true,
      data: publication,
    });
  } catch (err) {
    next(err);
  }
};

const getPublication = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    const publication = await publicationService.getPublication(
      projectId,
      ownerId,
    );

    res.json({
      success: true,
      data: publication,
    });
  } catch (err) {
    next(err);
  }
};

const unpublishProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    await publicationService.unpublishProject(projectId, ownerId);

    res.json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  publishProject,
  getPublication,
  unpublishProject,
};
