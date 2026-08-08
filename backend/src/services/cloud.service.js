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
const { resolveCloudStoragePath } = require("../utils/storagePath");
const {
  normalizeRelativePath,
  relativeDirname,
  relativeBasename,
  relativeExt,
  relativeJoin,
} = require("../utils/relativePath");

const verifyCloudOwnership = async (ownerId, relativePath) => {
  const result = await pool.query(
    `
    SELECT *
    FROM cloud_files
    WHERE
        owner_id = $1
    AND
        relative_path = $2
    `,
    [ownerId, relativePath],
  );

  if (result.rows.length === 0) {
    const error = new Error("Path not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const uploadCloudFile = async (
  ownerId,
  file,
  folder = "",
  incomingRelativePath = "",
) => {
  let relativePath;

  if (incomingRelativePath) {
    relativePath = relativeJoin(folder, incomingRelativePath);
  } else {
    relativePath = relativeJoin(folder, file.originalname);
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
  const fullPath = resolveCloudStoragePath(userId, relativePath);

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
    [userId, relativePath, relativeBasename(relativePath), fullPath],
  );

  return {
    relativePath,
  };
};

const createEmptyFile = async (userId, relativePath) => {
  const fullPath = resolveCloudStoragePath(userId, relativePath);

  await filesystem.ensureDirectory(relativeDirname(fullPath));

  await filesystem.writeContent(fullPath, "");

  const originalName = relativeBasename(relativePath);

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
        original_name,
        relative_path,
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

  const storagePath = resolveCloudStoragePath(ownerId, file.relative_path);

  const content = await filesystem.readContent(storagePath, "utf8");

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
      relative_path,
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

  const storagePath = resolveCloudStoragePath(
    ownerId,
    result.rows[0].relative_path,
  );

  await filesystem.writeContent(storagePath, content, "utf8");

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
        relative_path,
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

  return {
    ...file,
    storage_path: resolveCloudStoragePath(ownerId, file.relative_path),
  };
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

  const storagePath = resolveCloudStoragePath(ownerId, file.relative_path);

  await filesystem.removeDiskFile(storagePath);

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

const renamePath = async (fileId, ownerId, newName) => {
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

  const item = result.rows[0];

  const oldPath = item.relative_path;

  const folder = relativeDirname(oldPath);

  const newPath = folder === "." ? newName : relativeJoin(folder, newName);

  const oldStorage = resolveCloudStoragePath(ownerId, oldPath);

  const newStorage = resolveCloudStoragePath(ownerId, newPath);

  await filesystem.ensureDirectory(relativeDirname(newStorage));

  await filesystem.moveUploadedFile(oldStorage, newStorage);

  //
  // File
  //

  if (!item.is_directory) {
    await pool.query(
      `
    UPDATE cloud_files
    SET
        original_name = $2,
        relative_path = $3,
        storage_path = $4
    WHERE id = $1
    `,
      [fileId, relativeBasename(newPath), newPath, newStorage],
    );

    return;
  }

  //
  // Folder
  //

  const rows = await pool.query(
    `
  SELECT *
  FROM cloud_files
  WHERE
      owner_id = $1
  AND
      relative_path LIKE $2
  `,
    [ownerId, `${oldPath}%`],
  );

  for (const file of rows.rows) {
    const updatedRelative =
      newPath + file.relative_path.substring(oldPath.length);

    const updatedStorage = relativeJoin(root, updatedRelative);

    await pool.query(
      `
    UPDATE cloud_files
    SET
        relative_path = $2,
        storage_path = $3,
        original_name = $4
    WHERE id = $1
    `,
      [
        file.id,
        updatedRelative,
        updatedStorage,
        relativeBasename(updatedRelative),
      ],
    );
  }
};

const movePath = async (ownerId, sourceRelative, destinationRelative, type) => {
  const result = await pool.query(
    `
  SELECT *
  FROM cloud_files
  WHERE
      owner_id = $1
  AND
      relative_path = $2
  `,
    [ownerId, sourceRelative],
  );

  if (result.rows.length === 0) {
    throw new Error("Source not found");
  }

  const item = result.rows[0];
  const sourceStorage = resolveCloudStoragePath(ownerId, sourceRelative);

  const destinationStorage = resolveCloudStoragePath(
    ownerId,
    destinationRelative,
  );
  await filesystem.ensureDirectory(relativeDirname(destinationStorage));

  await filesystem.moveUploadedFile(sourceStorage, destinationStorage);
  if (type === "file") {
    await pool.query(
      `
    UPDATE cloud_files
    SET
        relative_path = $2,
        storage_path = $3,
        original_name = $4
    WHERE id = $1
    `,
      [
        item.id,
        destinationRelative,
        destinationStorage,
        relativeBasename(destinationRelative),
      ],
    );

    return;
  }
  const rows = await pool.query(
    `
  SELECT *
  FROM cloud_files
  WHERE
      owner_id = $1
  AND
      relative_path LIKE $2
  `,
    [ownerId, `${sourceRelative}%`],
  );

  for (const file of rows.rows) {
    const updatedRelative =
      destinationRelative + file.relative_path.substring(sourceRelative.length);

    const updatedStorage = resolveCloudStoragePath(ownerId, updatedRelative);

    await pool.query(
      `
    UPDATE cloud_files
    SET
        relative_path = $2,
        storage_path = $3,
        original_name = $4
    WHERE id = $1
    `,
      [
        file.id,
        updatedRelative,
        updatedStorage,
        relativeBasename(updatedRelative),
      ],
    );
  }
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
      const storagePath = resolveCloudStoragePath(ownerId, file.relative_path);

      const success = await filesystem.removeDiskFile(storagePath);

      console.log("Delete result:", success);

      await filesystem.cleanupEmptyDirectories(
        path.dirname(storagePath),
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

const copyPath = async (ownerId, relativePath, type) => {
  await verifyCloudOwnership(ownerId, relativePath);

  return {
    operation: "copy",
    relativePath,
    type,
  };
};

const cutPath = async (ownerId, relativePath, type) => {
  await verifyCloudOwnership(ownerId, relativePath);

  return {
    operation: "cut",
    relativePath,
    type,
  };
};

const generateDuplicatePath = async (projectId, relativePath) => {
  relativePath = normalizeRelativePath(relativePath);

  const extension = relativeExt(relativePath);

  const directory = relativeDirname(relativePath);

  const baseName = path.posix.basename(relativePath, extension);

  let candidate = relativePath;

  let counter = 1;

  while (true) {
    const exists = await pool.query(
      `
      SELECT id
FROM cloud_files
      WHERE owner_id = $1
      AND relative_path = $2
      `,
      [projectId, candidate],
    );

    if (exists.rows.length === 0) {
      return candidate;
    }

    const newName = `${baseName} (${counter})${extension}`;

    candidate = directory === "." ? newName : relativeJoin(directory, newName);

    counter++;
  }
};

const pastePath = async (ownerId, clipboard, destination) => {
  await verifyCloudOwnership(ownerId, clipboard.relativePath);

  const sourceRelative = clipboard.relativePath;
  const sourcePath = resolveCloudStoragePath(ownerId, sourceRelative);

  const desiredRelative = relativeJoin(
    destination,
    relativeBasename(sourceRelative),
  );

  const destinationRelative =
    clipboard.operation === "copy"
      ? await generateDuplicatePath(ownerId, desiredRelative)
      : desiredRelative;

  const destinationPath = resolveCloudStoragePath(ownerId, destinationRelative);

  //
  // Prevent pasting into itself
  //
  if (clipboard.type === "folder" && destination.startsWith(sourceRelative)) {
    const error = new Error("Invalid destination");
    error.status = 400;
    throw error;
  }

  //
  // Copy
  //

  if (clipboard.operation === "copy") {
    if (clipboard.type === "folder") {
      const folderSize = await filesystem.calculateDirectorySize(sourcePath);

      await storageAllocation.checkQuota(ownerId, folderSize);
    }
  }

  if (clipboard.operation === "copy") {
    if (clipboard.type === "file") {
      await filesystem.copyFile(sourcePath, destinationPath);
      const exists = await fs
        .access(destinationPath)
        .then(() => true)
        .catch(() => false);

      console.log({
        sourcePath,
        destinationPath,
        copied: exists,
      });
      const file = await pool.query(
        `
        SELECT *
        FROM cloud_files
        WHERE
            owner_id = $1
        AND
            relative_path = $2
        `,
        [ownerId, sourceRelative],
      );

      const original = file.rows[0];

      await pool.query(
        `
        INSERT INTO cloud_files
        (
            owner_id,
            original_name,
            relative_path,
            stored_name,
            mime_type,
            file_size,
            storage_path,
            is_directory
        )
        VALUES
        (
            $1,$2,$3,$4,$5,$6,$7,false
        )
        `,
        [
          ownerId,
          original.original_name,
          destinationRelative,
          original.stored_name,
          original.mime_type,
          original.file_size,
          destinationPath,
        ],
      );

      await storageAllocation.reserveStorage(
        ownerId,
        Number(original.file_size),
      );
    } else {
      //
      // Folder copy (next step)
      //
      await filesystem.copyDirectory(sourcePath, destinationPath);

      const rows = await pool.query(
        `
SELECT *
FROM cloud_files
WHERE
    owner_id = $1
AND
    relative_path LIKE $2
ORDER BY LENGTH(relative_path)
`,
        [ownerId, `${sourceRelative}%`],
      );

      let totalBytes = 0;

      for (const item of rows.rows) {
        const newRelative =
          destinationRelative +
          item.relative_path.substring(sourceRelative.length);

        const newStorage = resolveCloudStoragePath(ownerId, newRelative);

        await pool.query(
          `
INSERT INTO cloud_files
(
    owner_id,
    original_name,
    relative_path,
    stored_name,
    mime_type,
    file_size,
    storage_path,
    is_directory
)
VALUES
(
    $1,$2,$3,$4,$5,$6,$7,$8
)
`,
          [
            ownerId,
            item.original_name,
            newRelative,
            item.stored_name,
            item.mime_type,
            item.file_size,
            newStorage,
            item.is_directory,
          ],
        );

        if (!item.is_directory) totalBytes += Number(item.file_size);
      }

      await storageAllocation.reserveStorage(ownerId, totalBytes);
    }
  }

  //
  // Cut
  //
  if (clipboard.operation === "cut") {
    const existing = await pool.query(
      `
  SELECT id
  FROM cloud_files
  WHERE
      owner_id = $1
  AND
      relative_path = $2
  `,
      [ownerId, destinationRelative],
    );

    if (existing.rows.length > 0) {
      const error = new Error(
        "A file or folder with this name already exists.",
      );
      error.status = 409;
      throw error;
    }
  }

  await movePath(ownerId, sourceRelative, destinationRelative, clipboard.type);

  return {
    success: true,
  };
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
  renamePath,
  movePath,
  getStats,
  deleteFolder,
  copyPath,
  cutPath,
  pastePath,
};
