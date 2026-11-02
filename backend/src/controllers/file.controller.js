const {
  saveFile,
  getProjectFiles,
  getFileForDownload,
  deleteFile,
  loadFileContent,
  updateFileContent,
} = require("../services/file.service");

const {
  createFolder,
  createEmptyFile,
  renamePath,
  deletePath,
} = require("../services/file.service");

const fileService = require("../services/file.service");

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error("No file uploaded.");
    }

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
    const fsSync = require("fs");
    if (!fsSync.existsSync(file.storage_path)) {
      const error = new Error("File not found on storage disk");
      error.status = 404;
      throw error;
    }
    const stat = fsSync.statSync(file.storage_path);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res
          .status(416)
          .send("Requested range not satisfiable\n" + start + " >= " + fileSize);
        return;
      }

      const chunksize = end - start + 1;
      const fileStream = fsSync.createReadStream(file.storage_path, {
        start,
        end,
      });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": file.mime_type || "application/octet-stream",
      };

      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      res.download(file.storage_path, file.original_name);
    }
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

const createProjectFile = async (req, res, next) => {
  try {
    const file = await createEmptyFile(
      req.params.id,
      req.user.id,
      req.body.path,
    );

    res.status(201).json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

const renameProjectFile = async (req, res, next) => {
  try {
    const file = await renamePath(req.params.id, req.user.id, req.body.path);

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProjectPath = async (req, res, next) => {
  try {
    await deletePath(req.params.id, req.user.id, req.body.path, req.body.type);

    res.json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};
const renameProjectPath = async (req, res, next) => {
  try {
    await renamePath(
      req.params.id,
      req.user.id,
      req.body.oldPath,
      req.body.newPath,
      req.body.type,
    );

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const copyPath = async (req, res, next) => {
  try {
    const result = await fileService.copyPath(
      req.body.projectId,
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

const cutPath = async (req, res, next) => {
  try {
    const result = await fileService.cutPath(
      req.body.projectId,
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

const pastePath = async (req, res, next) => {
  try {
    const result = await fileService.pastePath(
      req.body.projectId,
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

const deletePaths = async (req, res, next) => {
  try {
    const result = await fileService.deletePaths(
      req.params.id,
      req.user.id,
      req.body.items,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const downloadPaths = async (req, res, next) => {
  try {
    const items = await fileService.downloadPaths(
      req.params.id,
      req.user.id,
      req.body.items,
    );

    res.setHeader("Content-Disposition", 'attachment; filename="download.zip"');
    res.setHeader("Content-Type", "application/zip");

    await fileService.createDownloadArchive(req.params.id, items, res);
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await fileService.getProjectStats(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

const extractArchive = async (req, res, next) => {
  try {
    const result = await fileService.extractArchive(
      req.params.id,
      req.user.id,
      req.body.relativePath,
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
  uploadFile,
  listFiles,
  downloadFile,
  removeFile,

  saveFileContent,
  getFileContent,
  createProjectFolder,
  createProjectFile,
  renameProjectFile,
  deleteProjectPath,
  renameProjectPath,
  copyPath,
  cutPath,
  pastePath,
  deletePaths,
  downloadPaths,
  getStats,
  extractArchive,
};
