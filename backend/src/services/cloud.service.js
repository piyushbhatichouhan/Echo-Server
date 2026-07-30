const path = require("path");
const { pool } = require("../config/database");
const workspace = require("./workspace.service");
const workspaceFileService = require("./workspace.file.service");
const cloudRepository = require("../repositories/cloud.repository");
const { getCloudRoot } = require("../storage/cloud.storage.manager");
const filesystem = require("../services/filesystem.service");
const storageService = require("./storage.service");
const fs = require("fs/promises");
const storageAllocation = require("./storageAllocation.service");

const uploadCloudFile = async (
  ownerId,
  file,
  folder = "",
  incomingRelativePath = "",
) => {
  let relativePath;

  if (incomingRelativePath) {
    relativePath = folder
      ? path.posix.join(folder, incomingRelativePath)
      : incomingRelativePath;
  } else {
    relativePath = folder
      ? path.posix.join(folder, file.originalname)
      : file.originalname;
  }

  const existing = await cloudRepository.getCloudFileByPath(
    ownerId,
    relativePath,
  );

  const replacingBytes = existing ? Number(existing.file_size) : 0;

  const growth = Math.max(0, file.size - replacingBytes);

  await storageAllocation.checkQuota(ownerId, growth);

  const { filesPath } = await workspace.ensureCloudWorkspace(ownerId);

  const finalPath = await workspaceFileService.storeUploadedFile({
    workspaceRoot: filesPath,
    uploadedFile: file,
    relativePath,
  });

  const data = {
    ownerId,
    originalName: file.originalname,
    relativePath,
    storedName: file.filename,
    mimeType: file.mimetype,
    fileSize: file.size,
    storagePath: finalPath,
    isDirectory: false,
  };

  if (file.size > replacingBytes) {
    await storageAllocation.reserveStorage(ownerId, file.size - replacingBytes);
  } else if (file.size < replacingBytes) {
    await storageAllocation.releaseStorage(ownerId, replacingBytes - file.size);
  }

  try {
    if (existing) {
      return await cloudRepository.updateCloudFile(existing.id, data);
    }

    return await cloudRepository.createCloudFile(data);

    // success
  } catch (err) {
    await storageAllocation.releaseStorage(ownerId, file.size);

    throw err;
  }
};

const getCloudFiles = async (ownerId) => {
  return await cloudRepository.getCloudFiles(ownerId);
};

const createFolder = async (userId, relativePath) => {
  const root = getCloudRoot(userId);

  const fullPath = path.join(root, relativePath);

  await filesystem.ensureDirectory(fullPath);

  await pool.query(
    `
        INSERT INTO cloud_files
        (
            owner_id,
            relative_path,
            original_name,
            storage_path,
            is_directory,
            file_size
        )
        VALUES
        (
            $1,$2,$3,$4,TRUE,0
        )
        `,
    [userId, relativePath, path.basename(relativePath), fullPath],
  );

  return {
    relativePath,
  };
};

const createEmptyFile = async (userId, relativePath) => {
  const root = getCloudRoot(userId);

  const fullPath = path.join(root, relativePath);

  await filesystem.ensureDirectory(path.dirname(fullPath));

  await filesystem.writeContent(fullPath, "");

  const originalName = path.basename(relativePath);

  const result = await pool.query(
    `
    INSERT INTO cloud_files
    (
        owner_id,
        original_name,
        relative_path,
        storage_path,
        mime_type,
        file_size,
        is_directory
    )
    VALUES
    (
        $1,$2,$3,$4,$5,0,FALSE
    )
    RETURNING *
    `,
    [userId, originalName, relativePath, fullPath, "text/plain"],
  );

  return result.rows[0];
};

const loadFileContent = async (fileId, ownerId) => {
  const result = await pool.query(
    `
    SELECT
        storage_path,
        original_name,
        mime_type
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const content = await filesystem.readContent(file.storage_path, "utf8");

  return {
    name: file.original_name,
    mimeType: file.mime_type,
    content,
  };
};

const updateFileContent = async (fileId, ownerId, content) => {
  const result = await pool.query(
    `
    SELECT
        storage_path,
        file_size
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const oldSize = Number(result.rows[0].file_size);
  const newSize = Buffer.byteLength(content, "utf8");

  const growth = Math.max(0, newSize - oldSize);

  await storageAllocation.checkQuota(ownerId, growth);

  await filesystem.writeContent(result.rows[0].storage_path, content, "utf8");

  if (newSize > oldSize)
    storageAllocation.reserveStorage(ownerId, newSize - oldSize);
  else if (newSize < oldSize)
    storageAllocation.releaseStorage(ownerId, oldSize - newSize);

  await pool.query(
    `
    UPDATE cloud_files
    SET
        file_size = $2
    WHERE
        id = $1
    `,
    [fileId, newSize],
  );

  return {
    success: true,
  };
};

const getFileForDownload = async (fileId, ownerId) => {
  const result = await pool.query(
    `
    SELECT
        id,
        original_name,
        storage_path,
        mime_type
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const deleteFile = async (fileId, ownerId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  await filesystem.removeDiskFile(file.storage_path);

  await storageAllocation.releaseStorage(ownerId, file.file_size);

  await pool.query(
    `
    DELETE FROM cloud_files
    WHERE id = $1
    `,
    [fileId],
  );

  return {
    success: true,
  };
};

const renameFile = async (fileId, ownerId, newName) => {
  const result = await pool.query(
    `
    SELECT *
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const oldRelative = file.relative_path;

  const parts = oldRelative.split("/");

  parts[parts.length - 1] = newName;

  const newRelative = parts.join("/");

  const newStoragePath = path.join(getCloudRoot(ownerId), newRelative);

  await filesystem.moveUploadedFile(file.storage_path, newStoragePath);

  const updated = await pool.query(
    `
   UPDATE cloud_files
SET
    original_name = $2,
    relative_path = $3,
    storage_path = $4
WHERE
    id = $1
RETURNING *
    `,
    [fileId, newName, newRelative, newStoragePath],
  );

  return updated.rows[0];
};

const getStats = async (ownerId) => {
  return await storageService.getUserStorageStats(ownerId);
};

const deleteFolder = async (ownerId, folderPath) => {
  const { filesPath } = await workspace.ensureCloudWorkspace(ownerId);

  const deleted = await cloudRepository.deleteFolder(ownerId, folderPath);

  for (const file of deleted) {
    if (!file.storage_path) continue;

    try {
      const success = await filesystem.removeDiskFile(file.storage_path);

      console.log("Delete result:", success);

      await filesystem.cleanupEmptyDirectories(
        path.dirname(file.storage_path),
        filesPath,
      );
      await storageAllocation.releaseStorage(ownerId, file.file_size);
    } catch (err) {
      console.warn("Could not delete:", file.storage_path);
      console.warn(err);
    }
  }

  return deleted;
};

module.exports = {
  uploadCloudFile,
  getCloudFiles,
  createFolder,
  createEmptyFile,
  loadFileContent,
  updateFileContent,
  getFileForDownload,
  deleteFile,
  renameFile,
  getStats,
  deleteFolder,
};
