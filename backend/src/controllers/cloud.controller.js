const cloudService = require("../services/cloud.service");

const upload = async (req, res, next) => {
  try {
    const file = req.file;
    const userId = req.user.id;

    const folder = req.body.folder || "";

    const relativePath = req.body.relativePath || "";

    const uploaded = await cloudService.uploadCloudFile(
      userId,
      file,
      folder,
      relativePath,
    );

    res.status(201).json({
      success: true,
      data: uploaded,
    });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const files = await cloudService.getCloudFiles(req.user.id);

    res.json({
      success: true,
      data: files,
    });
  } catch (err) {
    next(err);
  }
};

const createFolder = async (req, res, next) => {
  try {
    const folder = await cloudService.createFolder(req.user.id, req.body.path);

    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (err) {
    next(err);
  }
};

const createFile = async (req, res, next) => {
  try {
    const file = await cloudService.createEmptyFile(req.user.id, req.body.path);

    res.status(201).json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

const getFileContent = async (req, res, next) => {
  try {
    const file = await cloudService.loadFileContent(req.params.id, req.user.id);

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

const saveFileContent = async (req, res, next) => {
  try {
    const result = await cloudService.updateFileContent(
      req.params.id,
      req.user.id,
      req.body.content,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const download = async (req, res, next) => {
  try {
    const file = await cloudService.getFileForDownload(
      req.params.id,
      req.user.id,
    );

    res.download(file.storage_path, file.original_name, {
      headers: {
        "Content-Type": file.mime_type,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const result = await cloudService.deleteFile(req.params.id, req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const renameFile = async (req, res, next) => {
  try {
    await cloudService.renamePath(
      req.params.id, // file id
      req.user.id,
      req.body.name,
    );

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await cloudService.getStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

const deleteFolder = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    const { path } = req.body;

    await cloudService.deleteFolder(ownerId, path);

    res.json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

const copyCloudPath = async (req, res, next) => {
  try {
    const result = await cloudService.copyPath(
      req.user.id,
      req.body.relativePath,
      req.body.type,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const cutCloudPath = async (req, res, next) => {
  try {
    const result = await cloudService.cutPath(
      req.user.id,
      req.body.relativePath,
      req.body.type,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const pasteCloudPath = async (req, res, next) => {
  try {
    const result = await cloudService.pastePath(
      req.user.id,
      req.body.clipboard,
      req.body.destination,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  upload,
  list,
  createFolder,
  createFile,
  getFileContent,
  saveFileContent,
  download,
  deleteFile,
  renameFile,
  getStats,
  deleteFolder,
  copyCloudPath,
  pasteCloudPath,
  cutCloudPath,
};
