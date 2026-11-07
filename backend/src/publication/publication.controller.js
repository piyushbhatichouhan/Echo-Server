const publicationService = require("./publication.service");

const checkSubdomain = async (req, res, next) => {
  try {
    const { subdomain, projectId } = req.query;
    const userId = req.user.id;

    const result = await publicationService.checkCustomSubdomainAvailability(
      subdomain,
      userId,
      projectId,
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

const updateSubdomain = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;
    const { customSubdomain, subdomainType } = req.body || {};

    const publication = await publicationService.updateSubdomain(
      projectId,
      ownerId,
      { customSubdomain, subdomainType },
    );

    res.json({
      success: true,
      message: "Subdomain updated successfully.",
      data: publication,
    });
  } catch (err) {
    next(err);
  }
};

const getSubdomainRequest = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    const request = await publicationService.getSubdomainRequest(
      projectId,
      ownerId,
    );

    res.json({
      success: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

const requestCustomSubdomain = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;
    const { subdomain } = req.body || {};

    const request = await publicationService.requestCustomSubdomain(
      projectId,
      ownerId,
      subdomain,
    );

    res.status(201).json({
      success: true,
      message:
        request.status === "approved"
          ? "Custom subdomain approved successfully."
          : "Custom subdomain request submitted to the Super Admin for approval.",
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

const cancelSubdomainRequest = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    await publicationService.cancelSubdomainRequest(projectId, ownerId);

    res.json({
      success: true,
      message: "Custom subdomain request has been cancelled.",
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
  updateSubdomain,
  getSubdomainRequest,
  requestCustomSubdomain,
  cancelSubdomainRequest,
};
