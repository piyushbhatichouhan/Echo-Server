const {
  saveFile,
  getProjectFiles,
  getFileForDownload,
  deleteFile,
  loadFileContent,
  updateFileContent,
} = require("../services/file.service");

const { createFolder } = require("../services/file.service");

const uploadFile = async (req, res, next) => {
  try {
    req.file.relativePath = req.body.relativePath || req.file.originalname;
    const file = await saveFile(req.params.id, req.user.id, req.file);

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

const listFiles = async (req, res, next) => {
  try {
    const files = await getProjectFiles(req.params.id, req.user.id);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const file = await getFileForDownload(req.params.id, req.user.id);

    res.download(file.storage_path, file.original_name);
  } catch (error) {
    next(error);
  }
};

const removeFile = async (req, res, next) => {
  try {
    const result = await deleteFile(req.params.id, req.user.id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const saveFileContent = async (req, res, next) => {
  try {
    await updateFileContent(req.params.id, req.user.id, req.body.content);

    res.json({
      success: true,
      message: "File saved.",
    });
  } catch (error) {
    next(error);
  }
};

const getFileContent = async (req, res, next) => {
  try {
    const file = await loadFileContent(req.params.id, req.user.id);

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

const createProjectFolder = async (req, res, next) => {
  try {
    const folder = await createFolder(
      req.params.id,
      req.user.id,
      req.body.path,
    );

    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  listFiles,
  downloadFile,
  removeFile,

  saveFileContent,
  getFileContent,
  createProjectFolder,
};
