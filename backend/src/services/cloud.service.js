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
const { ZipArchive } = require("archiver");
const AdmZip = require("adm-zip");

const verifyCloudOwnership = async (ownerId, relativePath) => {
  const normalized = normalizeRelativePath(relativePath || "");
  const result = await pool.query(
    `
    SELECT *
    FROM cloud_files
    WHERE
        owner_id = $1
    AND
        (relative_path = $2 OR relative_path LIKE $3)
    AND
        deleted_at IS NULL
    LIMIT 1
    `,
    [ownerId, normalized, `${normalized}/%`],
  );

  if (result.rows.length === 0) {
    const diskPath = resolveCloudStoragePath(ownerId, normalized);
    const diskExists = await fs
      .access(diskPath)
      .then(() => true)
      .catch(() => false);

    if (!diskExists) {
      const error = new Error("Path not found");
      error.status = 404;
      throw error;
    }
  }

  return result.rows[0] || null;
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
  const fsSync = require("fs");
  const result = await pool.query(
    `
    SELECT
        original_name,
        relative_path,
        storage_path,
        mime_type
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    AND
        deleted_at IS NULL
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const resolved = resolveCloudStoragePath(ownerId, file.relative_path);
  let storagePath = resolved;
  if (!fsSync.existsSync(storagePath) && file.storage_path && fsSync.existsSync(file.storage_path)) {
    storagePath = file.storage_path;
  }

  if (!fsSync.existsSync(storagePath)) {
    const error = new Error("File exists in database but is missing from storage.");
    error.status = 404;
    throw error;
  }

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
    await storageAllocation.reserveStorage(ownerId, newSize - oldSize);
  else if (newSize < oldSize)
    await storageAllocation.releaseStorage(ownerId, oldSize - newSize);

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
  const fsSync = require("fs");
  const result = await pool.query(
    `
    SELECT
        id,
        original_name,
        relative_path,
        storage_path,
        mime_type
    FROM cloud_files
    WHERE
        id = $1
    AND
        owner_id = $2
    AND
        deleted_at IS NULL
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const resolved = resolveCloudStoragePath(ownerId, file.relative_path);
  let finalStoragePath = resolved;
  if (!fsSync.existsSync(finalStoragePath) && file.storage_path && fsSync.existsSync(file.storage_path)) {
    finalStoragePath = file.storage_path;
  }

  if (!fsSync.existsSync(finalStoragePath)) {
    const error = new Error("File exists in database but is missing from storage.");
    error.status = 404;
    throw error;
  }

  return {
    ...file,
    storage_path: finalStoragePath,
  };
};

const deleteFile = async (fileId, ownerId, permanent = false) => {
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

  if (!permanent) {
    await cloudRepository.softDeleteCloudFile(fileId, ownerId);
    return {
      success: true,
      movedToTrash: true,
    };
  }

  const storagePath = resolveCloudStoragePath(ownerId, file.relative_path);

  try {
    await filesystem.removeDiskFile(storagePath);
  } catch (err) {
    console.warn("Could not delete cloud file from disk:", storagePath, err.message);
  }

  const freedBytes = Number(file.file_size || 0);
  if (freedBytes > 0) {
    await storageAllocation.releaseStorage(ownerId, freedBytes);
  }

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

const renamePath = async (identifier, ownerId, newName) => {
  let result = null;
  const isUuid =
    typeof identifier === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );
  const isNumeric =
    typeof identifier === "number" ||
    (!isNaN(identifier) && !isNaN(parseInt(identifier)));

  if (isUuid || isNumeric) {
    result = await pool.query(
      `
      SELECT *
      FROM cloud_files
      WHERE id = $1
        AND owner_id = $2
        AND deleted_at IS NULL
      `,
      [identifier, ownerId],
    );
  }

  if (!result || result.rows.length === 0) {
    const norm = normalizeRelativePath(String(identifier || ""));
    result = await pool.query(
      `
      SELECT *
      FROM cloud_files
      WHERE relative_path = $1
        AND owner_id = $2
        AND deleted_at IS NULL
      `,
      [norm, ownerId],
    );
  }

  if (!result || result.rows.length === 0) {
    const error = new Error("File or folder not found");
    error.status = 404;
    throw error;
  }

  const item = result.rows[0];

  const oldPath = item.relative_path;
  const folder = relativeDirname(oldPath);

  const newPath = folder === "." ? newName : relativeJoin(folder, newName);

  // Don't allow renaming to the same path
  if (newPath === oldPath) {
    return;
  }

  // Make sure destination doesn't already exist
  const existing = await pool.query(
    `
    SELECT id
    FROM cloud_files
    WHERE owner_id = $1
      AND relative_path = $2
      AND id <> $3
    `,
    [ownerId, newPath, item.id],
  );

  if (existing.rows.length > 0) {
    const error = new Error("A file or folder with this name already exists.");
    error.status = 409;
    throw error;
  }

  const oldStorage = resolveCloudStoragePath(ownerId, oldPath);

  const newStorage = resolveCloudStoragePath(ownerId, newPath);

  // Make sure the physical source actually exists
  const sourceExists = await fs
    .access(oldStorage)
    .then(() => true)
    .catch(() => false);

  if (!sourceExists) {
    const error = new Error(
      "The file exists in the database but is missing from storage.",
    );
    error.status = 404;
    throw error;
  }

  await filesystem.ensureDirectory(path.dirname(newStorage));

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
      [item.id, relativeBasename(newPath), newPath, newStorage],
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
    WHERE owner_id = $1
      AND (
        relative_path = $2
        OR relative_path LIKE $3
      )
    `,
    [ownerId, oldPath, `${oldPath}/%`],
  );

  for (const file of rows.rows) {
    const updatedRelative =
      newPath + file.relative_path.substring(oldPath.length);

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

  await fs.mkdir(path.dirname(destinationStorage), {
    recursive: true,
  });

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
      (relative_path = $2 OR relative_path LIKE $3)
  `,
    [ownerId, sourceRelative, `${sourceRelative}/%`],
  );

  for (const file of rows.rows) {
    const updatedRelative =
      file.relative_path === sourceRelative
        ? destinationRelative
        : destinationRelative +
          file.relative_path.substring(sourceRelative.length);

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

const deleteFolder = async (ownerId, folderPath, permanent = false) => {
  if (!permanent) {
    await cloudRepository.softDeleteFolder(ownerId, folderPath);
    return {
      success: true,
      movedToTrash: true,
    };
  }

  const { filesPath } = await workspace.ensureCloudWorkspace(ownerId);

  const deleted = await cloudRepository.deleteFolder(ownerId, folderPath);

  for (const file of deleted) {
    if (!file.storage_path || file.is_directory) continue;

    try {
      const storagePath = resolveCloudStoragePath(ownerId, file.relative_path);
      await filesystem.removeDiskFile(storagePath);
    } catch (err) {
      console.warn("Could not delete from disk:", file.storage_path, err.message);
    }

    const freedBytes = Number(file.file_size || 0);
    if (freedBytes > 0) {
      try {
        await storageAllocation.releaseStorage(ownerId, freedBytes);
      } catch (err) {
        console.error("Error releasing storage:", err);
      }
    }
  }

  // Remove physical directory if it exists
  const physicalFolder = resolveCloudStoragePath(ownerId, folderPath);
  await fs.rm(physicalFolder, { recursive: true, force: true }).catch(() => {});
  await filesystem.cleanupEmptyDirectories(
    path.dirname(physicalFolder),
    filesPath,
  );

  return {
    success: true,
  };
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

const generateDuplicatePath = async (ownerId, relativePath) => {
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
      AND deleted_at IS NULL
      `,
      [ownerId, candidate],
    );

    const fullCandidatePath = resolveCloudStoragePath(ownerId, candidate);
    const diskExists = await fs
      .access(fullCandidatePath)
      .then(() => true)
      .catch(() => false);

    if (exists.rows.length === 0 && !diskExists) {
      return candidate;
    }

    const newName = `${baseName} (${counter})${extension}`;

    candidate = directory === "." ? newName : relativeJoin(directory, newName);

    counter++;
  }
};

const pastePath = async (ownerId, clipboard, destination = "") => {
  await verifyCloudOwnership(ownerId, clipboard.relativePath);

  const sourceRelative = normalizeRelativePath(clipboard.relativePath || "");
  const targetFolder = normalizeRelativePath(destination || "");

  const sourcePath = resolveCloudStoragePath(ownerId, sourceRelative);

  const desiredRelative = targetFolder
    ? relativeJoin(targetFolder, relativeBasename(sourceRelative))
    : relativeBasename(sourceRelative);

  if (clipboard.operation === "cut" && sourceRelative === desiredRelative) {
    return { success: true, message: "Item is already at this location" };
  }

  const destinationRelative =
    clipboard.operation === "copy"
      ? await generateDuplicatePath(ownerId, desiredRelative)
      : desiredRelative;

  const destinationPath = resolveCloudStoragePath(ownerId, destinationRelative);

  //
  // Prevent pasting into itself
  //
  if (
    clipboard.type === "folder" &&
    (targetFolder === sourceRelative ||
      targetFolder.startsWith(sourceRelative + "/"))
  ) {
    const error = new Error("Cannot paste a folder into itself or a subfolder");
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

      const file = await pool.query(
        `
        SELECT *
        FROM cloud_files
        WHERE
            owner_id = $1
        AND
            relative_path = $2
        AND
            deleted_at IS NULL
        `,
        [ownerId, sourceRelative],
      );

      const original = file.rows[0] || {};
      const stats = await fs.stat(destinationPath).catch(() => ({ size: 0 }));
      const fileSize = original.file_size || stats.size;
      const originalName = relativeBasename(destinationRelative);

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
          originalName,
          destinationRelative,
          original.stored_name || null,
          original.mime_type || null,
          fileSize,
          destinationPath,
        ],
      );

      await storageAllocation.reserveStorage(
        ownerId,
        Number(fileSize),
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
            (relative_path = $2 OR relative_path LIKE $3)
        AND
            deleted_at IS NULL
        ORDER BY LENGTH(relative_path)
        `,
        [ownerId, sourceRelative, `${sourceRelative}/%`],
      );

      let totalBytes = 0;

      for (const item of rows.rows) {
        const newRelative =
          item.relative_path === sourceRelative
            ? destinationRelative
            : destinationRelative +
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
            relativeBasename(newRelative),
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

      // If the source directory record itself wasn't in DB, ensure the destination directory record exists
      const destDirExists = rows.rows.some((r) => r.relative_path === sourceRelative);
      if (!destDirExists) {
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
              $1,$2,$3,NULL,NULL,0,$4,true
          )
          ON CONFLICT DO NOTHING
          `,
          [
            ownerId,
            relativeBasename(destinationRelative),
            destinationRelative,
            destinationPath,
          ],
        );
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
      AND
          deleted_at IS NULL
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

    await movePath(
      ownerId,
      sourceRelative,
      destinationRelative,
      clipboard.type,
    );
  }

  return {
    success: true,
  };
};

const deletePaths = async (ownerId, items, permanent = false) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected.");
    error.status = 400;
    throw error;
  }

  for (const item of items) {
    if (!item.relativePath || !item.type) {
      const error = new Error("Invalid item.");
      error.status = 400;
      throw error;
    }

    if (item.type === "folder") {
      await deleteFolder(ownerId, item.relativePath, permanent);
      continue;
    }

    if (item.type === "file") {
      const result = await pool.query(
        `
        SELECT id
        FROM cloud_files
        WHERE owner_id = $1
          AND relative_path = $2
        `,
        [ownerId, item.relativePath],
      );

      if (result.rows.length === 0) {
        const error = new Error(`File not found: ${item.relativePath}`);

        error.status = 404;
        throw error;
      }

      await deleteFile(result.rows[0].id, ownerId, permanent);
      continue;
    }

    const error = new Error("Invalid item type.");
    error.status = 400;
    throw error;
  }

  return {
    success: true,
    count: items.length,
  };
};

const createDownloadArchive = async (ownerId, items, output) => {
  const archive = new ZipArchive({
    zlib: { level: 9 },
  });

  archive.on("error", (error) => {
    output.destroy(error);
  });

  archive.pipe(output);

  for (const item of items) {
    const storagePath = resolveCloudStoragePath(ownerId, item.relative_path);

    if (item.is_directory) {
      archive.directory(storagePath, item.original_name);
    } else {
      archive.file(storagePath, {
        name: item.relative_path,
      });
    }
  }

  await archive.finalize();
};

const downloadPaths = async (ownerId, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected.");
    error.status = 400;
    throw error;
  }

  const validItems = [];

  for (const item of items) {
    const relativePath = item.path || item.file?.relative_path;

    if (!relativePath) {
      const error = new Error("Invalid selected item.");
      error.status = 400;
      throw error;
    }

    const result = await pool.query(
      `
      SELECT *
      FROM cloud_files
      WHERE owner_id = $1
        AND relative_path = $2
      `,
      [ownerId, relativePath],
    );

    if (result.rows.length === 0) {
      const error = new Error(`Path not found: ${relativePath}`);
      error.status = 404;
      throw error;
    }

    validItems.push(result.rows[0]);
  }

  return validItems;
};

const getTrash = async (ownerId) => {
  return await cloudRepository.getTrashFiles(ownerId);
};

const restoreFromTrash = async (fileId, ownerId) => {
  const result = await cloudRepository.restoreTrashFile(fileId, ownerId);
  if (!result) {
    const error = new Error("File not found in trash");
    error.status = 404;
    throw error;
  }
  return { success: true, restored: result };
};

const emptyTrash = async (ownerId) => {
  const trashed = await cloudRepository.purgeTrashFiles(ownerId);
  let totalBytesFreed = 0;

  for (const file of trashed) {
    try {
      const storagePath =
        file.storage_path || resolveCloudStoragePath(ownerId, file.relative_path);
      await filesystem.removeDiskFile(storagePath);
    } catch (err) {
      console.warn("Could not delete trashed path from disk:", file.relative_path, err.message);
    }
    if (!file.is_directory) {
      totalBytesFreed += Number(file.file_size || 0);
    }
  }

  if (totalBytesFreed > 0) {
    try {
      await storageAllocation.releaseStorage(ownerId, totalBytesFreed);
    } catch (err) {
      console.warn("Could not release storage allocation:", err.message);
    }
  }

  return {
    success: true,
    purgedCount: trashed.length,
    freedBytes: totalBytesFreed,
  };
};

const extractArchive = async (ownerId, relativePath, destination = "") => {
  const zipStoragePath = resolveCloudStoragePath(ownerId, relativePath);
  const destRelative = destination ? normalizeRelativePath(destination) : relativeDirname(relativePath);
  const destStoragePath = resolveCloudStoragePath(ownerId, destRelative);

  await filesystem.ensureDirectory(destStoragePath);

  const zip = new AdmZip(zipStoragePath);
  const zipEntries = zip.getEntries();

  // Validate all archive entry paths before extraction to prevent Zip Slip directory traversal attacks
  const resolvedDest = path.resolve(destStoragePath);
  for (const entry of zipEntries) {
    const entryTarget = path.resolve(resolvedDest, entry.entryName);
    if (
      entryTarget !== resolvedDest &&
      !entryTarget.startsWith(resolvedDest + path.sep)
    ) {
      const error = new Error(
        `Path traversal detected in archive entry: "${entry.entryName}". Extraction aborted.`,
      );
      error.status = 400;
      throw error;
    }
  }

  let totalUncompressedSize = 0;
  for (const entry of zipEntries) {
    if (!entry.isDirectory) {
      totalUncompressedSize += entry.header.size;
    }
  }

  await storageAllocation.checkQuota(ownerId, totalUncompressedSize);

  zip.extractAllTo(destStoragePath, true);

  for (const entry of zipEntries) {
    const entryRelative = destRelative === "." || !destRelative
      ? normalizeRelativePath(entry.entryName)
      : normalizeRelativePath(`${destRelative}/${entry.entryName}`);

    const entryStoragePath = resolveCloudStoragePath(ownerId, entryRelative);

    if (entry.isDirectory) {
      await pool.query(
        `
        INSERT INTO cloud_files
        (owner_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
        VALUES ($1, $2, $3, $4, 'directory', 0, $5, TRUE)
        ON CONFLICT DO NOTHING
        `,
        [ownerId, relativeBasename(entryRelative), entryRelative, relativeBasename(entryRelative), entryStoragePath],
      );
    } else {
      const existing = await pool.query(
        `SELECT id, file_size FROM cloud_files WHERE owner_id = $1 AND relative_path = $2`,
        [ownerId, entryRelative],
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE cloud_files SET file_size = $1, storage_path = $2, deleted_at = NULL WHERE id = $3`,
          [entry.header.size, entryStoragePath, existing.rows[0].id],
        );
      } else {
        await pool.query(
          `
          INSERT INTO cloud_files
          (owner_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
          VALUES ($1, $2, $3, $4, 'application/octet-stream', $5, $6, FALSE)
          `,
          [ownerId, relativeBasename(entryRelative), entryRelative, relativeBasename(entryRelative), entry.header.size, entryStoragePath],
        );
      }
    }
  }

  await storageAllocation.reserveStorage(ownerId, totalUncompressedSize);

  return {
    success: true,
    entriesCount: zipEntries.length,
    extractedBytes: totalUncompressedSize,
  };
};

const compressCloudPaths = async (
  ownerId,
  items,
  zipName = "archive.zip",
  destination = "",
) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected to compress");
    error.status = 400;
    throw error;
  }

  let finalName = (zipName || "archive.zip").trim();
  if (!finalName.toLowerCase().endsWith(".zip")) {
    finalName += ".zip";
  }

  const destFolder = destination ? normalizeRelativePath(destination) : "";
  const targetRelative = destFolder
    ? relativeJoin(destFolder, finalName)
    : finalName;
  const targetDiskPath = resolveCloudStoragePath(ownerId, targetRelative);

  const zip = new AdmZip();
  for (const item of items) {
    const rel = normalizeRelativePath(
      item.relativePath || item.path || item.relative_path || "",
    );
    if (!rel) continue;
    const isDir =
      item.isDirectory !== undefined ? item.isDirectory : item.type === "folder";
    const itemDiskPath = resolveCloudStoragePath(ownerId, rel);
    const bName = relativeBasename(rel);

    if (isDir) {
      zip.addLocalFolder(itemDiskPath, bName);
    } else {
      zip.addLocalFile(itemDiskPath, "", bName);
    }
  }

  const buffer = zip.toBuffer();
  await storageAllocation.checkQuota(ownerId, buffer.length);
  await filesystem.ensureDirectory(path.dirname(targetDiskPath));
  await fs.writeFile(targetDiskPath, buffer);

  const existing = await pool.query(
    `SELECT id FROM cloud_files WHERE owner_id = $1 AND relative_path = $2`,
    [ownerId, targetRelative],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE cloud_files SET file_size = $1, storage_path = $2, deleted_at = NULL, updated_at = NOW() WHERE id = $3`,
      [buffer.length, targetDiskPath, existing.rows[0].id],
    );
  } else {
    await pool.query(
      `INSERT INTO cloud_files
       (owner_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
       VALUES ($1, $2, $3, $4, 'application/zip', $5, $6, FALSE)`,
      [
        ownerId,
        finalName,
        targetRelative,
        finalName,
        buffer.length,
        targetDiskPath,
      ],
    );
  }

  await storageAllocation.reserveStorage(ownerId, buffer.length);

  return {
    success: true,
    fileName: finalName,
    relativePath: targetRelative,
    size: buffer.length,
  };
};

const searchCloudFiles = async (ownerId, query) => {
  if (!query || !query.trim()) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;
  const result = await pool.query(
    `
    SELECT
      id,
      original_name,
      relative_path,
      file_size,
      mime_type,
      is_directory,
      updated_at,
      created_at
    FROM cloud_files
    WHERE owner_id = $1
      AND deleted_at IS NULL
      AND (original_name ILIKE $2 OR relative_path ILIKE $2)
    ORDER BY is_directory DESC, original_name ASC
    LIMIT 100
    `,
    [ownerId, searchTerm],
  );

  return result.rows;
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
  deletePaths,
  downloadPaths,
  createDownloadArchive,
  getTrash,
  restoreFromTrash,
  emptyTrash,
  extractArchive,
  compressCloudPaths,
  searchCloudFiles,
};
