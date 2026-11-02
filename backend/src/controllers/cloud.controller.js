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
      res.download(file.storage_path, file.original_name, {
        headers: {
          "Content-Type": file.mime_type,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const permanent = req.query.permanent === "true";
    const result = await cloudService.deleteFile(
      req.params.id,
      req.user.id,
      permanent,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const downloadPaths = async (req, res, next) => {
  console.log("DOWNLOAD ITEMS:", req.body.items);
  try {
    const items = await cloudService.downloadPaths(req.user.id, req.body.items);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="download.zip"');

    await cloudService.createDownloadArchive(req.user.id, items, res);
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

const renamePath = async (req, res, next) => {
  try {
    const identifier = req.body.id || req.body.oldPath || req.body.path;
    const newName = req.body.newName || req.body.name;
    await cloudService.renamePath(identifier, req.user.id, newName);

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
    const permanent = req.query.permanent === "true";

    const result = await cloudService.deleteFolder(ownerId, path, permanent);

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
    const permanent = req.query.permanent === "true";
    const result = await cloudService.deletePaths(
      req.user.id,
      req.body.items,
      permanent,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
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

const getTrash = async (req, res, next) => {
  try {
    const files = await cloudService.getTrash(req.user.id);
    res.json({
      success: true,
      data: files,
    });
  } catch (err) {
    next(err);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const result = await cloudService.restoreFromTrash(
      req.body.fileId,
      req.user.id,
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const result = await cloudService.emptyTrash(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const extractArchive = async (req, res, next) => {
  try {
    const result = await cloudService.extractArchive(
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

const compressCloudPaths = async (req, res, next) => {
  try {
    const result = await cloudService.compressCloudPaths(
      req.user.id,
      req.body.items,
      req.body.zipName,
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

const searchCloudFiles = async (req, res, next) => {
  try {
    const result = await cloudService.searchCloudFiles(
      req.user.id,
      req.query.q || req.query.query,
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
  renamePath,
  getStats,
  deleteFolder,
  copyCloudPath,
  pasteCloudPath,
  cutCloudPath,
  deletePaths,
  downloadPaths,
  getTrash,
  restoreFromTrash,
  emptyTrash,
  extractArchive,
  compressCloudPaths,
  searchCloudFiles,
};
