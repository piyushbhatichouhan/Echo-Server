const { saveFile } = require("../services/file.service");
const {
  getProjectFiles,
  getFileForDownload,
  deleteFile,
} = require("../services/file.service");

const uploadFile = async (req, res, next) => {
  try {
    console.log("req.file =", req.file);
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

module.exports = {
  uploadFile,
  listFiles,
  downloadFile,
  removeFile,
};
