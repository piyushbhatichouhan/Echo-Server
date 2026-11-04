const publicationService = require("./publication.service");

const checkSubdomain = async (req, res, next) => {
  try {
    const { subdomain } = req.query;
    const userId = req.user.id;

    const result = await publicationService.checkCustomSubdomainAvailability(
      subdomain,
      userId,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const publishProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;
    const { customSubdomain, subdomainType } = req.body || {};

    const publication = await publicationService.publishProject(
      projectId,
      ownerId,
      { customSubdomain, subdomainType },
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
  checkSubdomain,
  publishProject,
  getPublication,
  unpublishProject,
};
