const { pool } = require("../config/database");
const fs = require("fs/promises");
const path = require("path");
const { verifyProjectOwnership } = require("./project.service");
const {
  getProjectFilesRoot,
  resolveProjectStoragePath,
  getProjectRoot,
} = require("../storage/project.storage.manager");
const storage = require("../config/storage");

//const { resolveProjectStoragePath } = require("../utils/storagePath");

const { syncWorkspaceToGit } = require("./workspace.sync.service");

const { getProjectGitDirectory } = require("../services/git.service");
const filesystem = require("./filesystem.service");
const workspace = require("./workspace.service");
const workspaceFileService = require("./workspace.file.service");
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

const saveFile = async (projectId, ownerId, file) => {
  const { verifyProjectOwnership } = require("./project.service");

  await verifyProjectOwnership(projectId, ownerId);

  const relativePath = normalizeRelativePath(
    file.relativePath || file.originalname,
  );

  const existing = await pool.query(
    `
    SELECT
        id,
        stored_name,
        relative_path,
        storage_path,
        file_size
    FROM files
    WHERE
        project_id = $1
    AND
        relative_path = $2
    `,
    [projectId, relativePath],
  );

  const replacingBytes =
    existing.rows.length > 0 ? Number(existing.rows[0].file_size) : 0;

  const growth = Math.max(0, file.size - replacingBytes);

  await storageAllocation.checkQuota(ownerId, growth);

  const workspaceRoot = getProjectFilesRoot(projectId);

  await filesystem.ensureDirectory(workspaceRoot);

  const finalPath = await workspaceFileService.storeUploadedFile({
    workspaceRoot,
    uploadedFile: file,
    relativePath,
  });

  // Canonical path derived from projectId + relativePath
  const storagePath = resolveProjectStoragePath(projectId, relativePath);

  if (file.size > replacingBytes) {
    await storageAllocation.reserveStorage(ownerId, file.size - replacingBytes);
  } else if (file.size < replacingBytes) {
    await storageAllocation.releaseStorage(ownerId, replacingBytes - file.size);
  }

  try {
    if (existing.rows.length > 0) {
      const oldFile = existing.rows[0];

      const result = await pool.query(
        `
        UPDATE files
        SET
            relative_path = $2,
            stored_name = $3,
            mime_type = $4,
            file_size = $5,
            storage_path = $6,
            is_directory = FALSE
        WHERE id = $1
        RETURNING *
        `,
        [
          oldFile.id,
          relativePath,
          file.filename,
          file.mimetype,
          file.size,
          storagePath,
        ],
      );

      return result.rows[0];
    }

    const result = await pool.query(
      `
      INSERT INTO files
      (
          project_id,
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
          $1,$2,$3,$4,$5,$6,$7,FALSE
      )
      RETURNING *
      `,
      [
        projectId,
        file.originalname,
        relativePath,
        file.filename,
        file.mimetype,
        file.size,
        storagePath,
      ],
    );

    return result.rows[0];
  } catch (error) {
    try {
      await filesystem.removeDiskFile(storagePath);
    } catch {}

    throw error;
  }
};

const getProjectFiles = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    ` 
 SELECT
    id,
    original_name,
    relative_path,
    is_directory,
    stored_name,
    storage_path,
    mime_type,
    file_size,
    created_at
        FROM files
        WHERE project_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        `,
    [projectId],
  );

  return result.rows;
};

const getProjectFilesForBuild = async (projectId) => {
  const result = await pool.query(
    `
    SELECT
        original_name,
        relative_path,
        stored_name
    FROM files
    WHERE project_id = $1
    AND is_directory = FALSE
    `,
    [projectId],
  );

  return result.rows.map((file) => ({
    ...file,
    storage_path: resolveProjectStoragePath(projectId, file.relative_path),
  }));
};

const deleteFile = async (fileId, ownerId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
    SELECT
        f.id,
        f.project_id,
        f.storage_path,
        f.relative_path,
        f.is_directory,
        f.file_size
    FROM files f
    INNER JOIN projects p
        ON p.id = f.project_id
    WHERE
        f.id = $1
    AND
        p.owner_id = $2
    `,
      [fileId, ownerId],
    );

    if (result.rows.length === 0) {
      const error = new Error("File not found");
      error.status = 404;

      throw error;
    }

    const file = result.rows[0];

    const storagePath = resolveProjectStoragePath(
      file.project_id,
      file.relative_path,
    );

    if (file.is_directory) {
      const dirPrefix = file.relative_path.endsWith("/")
        ? file.relative_path
        : `${file.relative_path}/`;

      const sizeRes = await client.query(
        `
        SELECT COALESCE(SUM(file_size), 0) AS total_size
        FROM files
        WHERE project_id = $1
          AND (relative_path = $2 OR relative_path LIKE $3)
        `,
        [file.project_id, file.relative_path, `${dirPrefix}%`],
      );
      const freedBytes = Number(sizeRes.rows[0]?.total_size || 0);

      await client.query(
        `
    DELETE FROM files
    WHERE
        project_id = $1
    AND
        (relative_path = $2 OR relative_path LIKE $3)
    `,
        [file.project_id, file.relative_path, `${dirPrefix}%`],
      );

      try {
        await fs.rm(storagePath, {
          recursive: true,
          force: true,
        });
      } catch (err) {
        console.warn("Could not delete directory from disk:", storagePath, err.message);
      }

      if (freedBytes > 0) {
        await storageAllocation.releaseStorage(ownerId, freedBytes);
      }
    } else {
      await client.query(
        `
    DELETE FROM files
    WHERE id = $1
    `,
        [file.id],
      );

      try {
        await filesystem.removeDiskFile(storagePath);
      } catch (err) {
        console.warn("Could not delete file from disk:", storagePath, err.message);
      }

      const freedBytes = Number(file.file_size || 0);
      if (freedBytes > 0) {
        await storageAllocation.releaseStorage(ownerId, freedBytes);
      }
    }

    await client.query("COMMIT");

    return {
      message: "File deleted successfully",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
};

const removeProjectDirectory = async (projectId) => {
  let projectOwnerId = null;
  try {
    const projectRes = await pool.query(
      `SELECT owner_id FROM projects WHERE id = $1`,
      [projectId],
    );

    if (projectRes.rows.length > 0) {
      projectOwnerId = projectRes.rows[0].owner_id;
      const sizeRes = await pool.query(
        `SELECT COALESCE(SUM(file_size), 0) AS total_bytes FROM files WHERE project_id = $1`,
        [projectId],
      );
      const totalBytes = Number(sizeRes.rows[0].total_bytes || 0);

      if (totalBytes > 0) {
        await storageAllocation.releaseStorage(projectOwnerId, totalBytes);
      }
    }
  } catch (err) {
    console.error(`Failed to release storage for project ${projectId}:`, err);
  }

  // Remove project directory
  const projectPath = getProjectRoot(projectId);
  try {
    await fs.rm(projectPath, {
      recursive: true,
      force: true,
    });
  } catch (err) {
    console.warn(`Could not delete project directory ${projectPath}:`, err.message);
  }

  // Remove git repository if exists
  if (storage.git) {
    const gitPath = path.join(storage.git, projectId.toString());
    try {
      await fs.rm(gitPath, {
        recursive: true,
        force: true,
      });
    } catch (err) {}
  }

  // Auto-reconcile owner's storage
  if (projectOwnerId && storageAllocation.recalculateUserStorage) {
    await storageAllocation.recalculateUserStorage(projectOwnerId).catch(() => {});
  }
};
const loadFileContent = async (fileId, ownerId) => {
  const result = await pool.query(
    `
    SELECT
        f.id,
        f.project_id,
        f.original_name,
        f.relative_path,
        f.mime_type
    FROM files f
    INNER JOIN projects p
        ON p.id = f.project_id
    WHERE
        f.id = $1
    AND
        p.owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const storagePath = resolveProjectStoragePath(
    file.project_id,
    file.relative_path,
  );

  const content = await filesystem.readContent(storagePath, "utf8");

  return {
    id: file.id,
    name: file.original_name,
    mimeType: file.mime_type,
    content,
  };
};

const updateFileContent = async (fileId, ownerId, content) => {
  const result = await pool.query(
    `
  SELECT
      f.project_id,
      f.relative_path,
      f.file_size
  FROM files f
  INNER JOIN projects p
      ON p.id = f.project_id
  WHERE
      f.id = $1
  AND
      p.owner_id = $2
  `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const storagePath = resolveProjectStoragePath(
    file.project_id,
    file.relative_path,
  );

  const oldSize = Number(file.file_size);

  const newSize = Buffer.byteLength(content, "utf8");

  const growth = Math.max(0, newSize - oldSize);

  await storageAllocation.checkQuota(ownerId, growth);

  await filesystem.writeContent(storagePath, content, "utf8");

  if (newSize > oldSize)
    await storageAllocation.reserveStorage(ownerId, newSize - oldSize);
  else if (newSize < oldSize)
    await storageAllocation.releaseStorage(ownerId, oldSize - newSize);

  await pool.query(
    `
  UPDATE files
  SET
      file_size = $2
  WHERE
      id = $1
  `,
    [fileId, newSize],
  );

  const file1 = await pool.query(
    `
    SELECT project_id
    FROM files
    WHERE id = $1
    `,
    [fileId],
  );

  await syncWorkspaceToGit(file1.rows[0].project_id);

  return {
    success: true,
  };
};

const renamePath = async (projectId, ownerId, oldPath, newPath, type) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const oldStoragePath = resolveProjectStoragePath(projectId, oldPath);

  const newStoragePath = resolveProjectStoragePath(projectId, newPath);

  await filesystem.ensureDirectory(relativeDirname(newStoragePath));

  await filesystem.moveUploadedFile(oldStoragePath, newStoragePath);

  if (type === "file") {
    await pool.query(
      `
      UPDATE files
      SET
          original_name = $3,
          relative_path = $2,
          storage_path = $4
      WHERE
          project_id = $1
      AND
          relative_path = $5
      `,
      [projectId, newPath, relativeBasename(newPath), newStoragePath, oldPath],
    );

    return;
  }

  const rows = await pool.query(
    `
    SELECT *
    FROM files
    WHERE
        project_id = $1
    AND
        (relative_path = $2 OR relative_path LIKE $3)
    `,
    [projectId, oldPath, `${oldPath}/%`],
  );

  for (const file of rows.rows) {
    const updatedRelative =
      file.relative_path === oldPath
        ? newPath
        : newPath + file.relative_path.substring(oldPath.length);

    const updatedStorage = resolveProjectStoragePath(
      projectId,
      updatedRelative,
    );

    await pool.query(
      `
      UPDATE files
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

const createFolder = async (projectId, ownerId, relativePath) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const folderPath = resolveProjectStoragePath(projectId, relativePath);

  await filesystem.ensureDirectory(folderPath);

  await pool.query(
    `
    INSERT INTO files
    (
        project_id,
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
        $1,$2,$3,NULL,NULL,0,$4,TRUE
    )
    `,
    [projectId, relativeBasename(relativePath), relativePath, folderPath],
  );

  return {
    relativePath,
  };
};

const createEmptyFile = async (projectId, ownerId, relativePath) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const fullPath = resolveProjectStoragePath(projectId, relativePath);

  await filesystem.ensureDirectory(path.dirname(fullPath));

  await filesystem.writeContent(fullPath, "");

  const originalName = path.basename(relativePath);

  const result = await pool.query(
    `
    INSERT INTO files
    (
        project_id,
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
    RETURNING *
    `,
    [
      projectId,
      originalName,
      relativePath,
      originalName,
      "text/plain",
      0,
      fullPath,
    ],
  );

  return result.rows[0];
};

const deletePath = async (projectId, ownerId, relativePath, type, permanent = false) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const dirPrefix = relativePath.endsWith("/") ? relativePath : `${relativePath}/`;

  if (!permanent) {
    if (type === "file") {
      await pool.query(
        `
        UPDATE files
        SET deleted_at = NOW()
        WHERE project_id = $1 AND relative_path = $2
        `,
        [projectId, relativePath],
      );
    } else {
      await pool.query(
        `
        UPDATE files
        SET deleted_at = NOW()
        WHERE project_id = $1 AND (relative_path = $2 OR relative_path LIKE $3)
        `,
        [projectId, relativePath, `${dirPrefix}%`],
      );
    }
    return { success: true, movedToTrash: true };
  }

  if (type === "file") {
    const result = await pool.query(
      `
      SELECT *
      FROM files
      WHERE
          project_id = $1
      AND
          relative_path = $2
      `,
      [projectId, relativePath],
    );

    if (result.rows.length === 0) {
      throw new Error("File not found");
    }

    const file = result.rows[0];

    const storagePath = resolveProjectStoragePath(
      projectId,
      file.relative_path,
    );

    try {
      await filesystem.removeDiskFile(storagePath);
    } catch (err) {
      console.warn("Could not delete file from disk:", storagePath, err.message);
    }

    const freedBytes = Number(file.file_size || 0);
    if (freedBytes > 0) {
      await storageAllocation.releaseStorage(ownerId, freedBytes);
    }

    await pool.query(
      `
      DELETE FROM files
      WHERE id = $1
      `,
      [file.id],
    );

    return { success: true };
  }

  const folderPath = resolveProjectStoragePath(projectId, relativePath);
  let folderSize = 0;
  try {
    folderSize = await filesystem.calculateDirectorySize(folderPath);
  } catch (err) {
    folderSize = 0;
  }

  const dbSizeRes = await pool.query(
    `
    SELECT COALESCE(SUM(file_size), 0) AS total_size
    FROM files
    WHERE project_id = $1
      AND (relative_path = $2 OR relative_path LIKE $3)
    `,
    [projectId, relativePath, `${dirPrefix}%`],
  );
  const dbFolderSize = Number(dbSizeRes.rows[0]?.total_size || 0);
  const freedBytes = Math.max(folderSize, dbFolderSize);

  if (freedBytes > 0) {
    await storageAllocation.releaseStorage(ownerId, freedBytes);
  }

  try {
    await fs.rm(folderPath, {
      recursive: true,
      force: true,
    });
  } catch (err) {
    console.warn("Could not delete folder from disk:", folderPath, err.message);
  }

  await pool.query(
    `
    DELETE FROM files
    WHERE
        project_id = $1
    AND
        (relative_path = $2 OR relative_path LIKE $3)
    `,
    [projectId, relativePath, `${dirPrefix}%`],
  );
  return { success: true };
};

const copyPath = async (projectId, ownerId, relativePath, type) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  return {
    operation: "copy",
    projectId,
    relativePath,
    type,
  };
};

const cutPath = async (projectId, ownerId, relativePath, type) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  return {
    operation: "cut",
    projectId,
    relativePath,
    type,
  };
};

const pastePath = async (projectId, ownerId, clipboard, destination = "") => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const sourceRelative = normalizeRelativePath(clipboard.relativePath || "");
  const targetFolder = normalizeRelativePath(destination || "");

  const sourcePath = resolveProjectStoragePath(projectId, sourceRelative);

  const desiredRelative = targetFolder
    ? relativeJoin(targetFolder, relativeBasename(sourceRelative))
    : relativeBasename(sourceRelative);

  if (clipboard.operation === "cut" && sourceRelative === desiredRelative) {
    return { success: true, message: "Item is already at this location" };
  }

  const destinationRelative =
    clipboard.operation === "copy"
      ? await generateDuplicatePath(projectId, desiredRelative)
      : desiredRelative;

  const destinationPath = resolveProjectStoragePath(
    projectId,
    destinationRelative,
  );

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
        FROM files
        WHERE
            project_id = $1
        AND
            relative_path = $2
        `,
        [projectId, sourceRelative],
      );

      const original = file.rows[0] || {};
      const stats = await fs.stat(destinationPath).catch(() => ({ size: 0 }));
      const fileSize = original.file_size || stats.size;
      const originalName = relativeBasename(destinationRelative);

      await pool.query(
        `
        INSERT INTO files
        (
            project_id,
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
          projectId,
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
        FROM files
        WHERE
            project_id = $1
        AND
            (relative_path = $2 OR relative_path LIKE $3)
        ORDER BY LENGTH(relative_path)
        `,
        [projectId, sourceRelative, `${sourceRelative}/%`],
      );

      let totalBytes = 0;

      for (const item of rows.rows) {
        const newRelative =
          item.relative_path === sourceRelative
            ? destinationRelative
            : destinationRelative +
              item.relative_path.substring(sourceRelative.length);

        const newStorage = resolveProjectStoragePath(projectId, newRelative);

        await pool.query(
          `
          INSERT INTO files
          (
              project_id,
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
            projectId,
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
          INSERT INTO files
          (
              project_id,
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
            projectId,
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
      FROM files
      WHERE
          project_id = $1
      AND
          relative_path = $2
      `,
      [projectId, destinationRelative],
    );

    if (existing.rows.length > 0) {
      const error = new Error(
        "A file or folder with this name already exists.",
      );
      error.status = 409;
      throw error;
    }

    await renamePath(
      projectId,
      ownerId,
      sourceRelative,
      destinationRelative,
      clipboard.type,
    );
  }

  await syncWorkspaceToGit(projectId);

  return {
    success: true,
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
      FROM files
      WHERE project_id = $1
      AND relative_path = $2
      `,
      [projectId, candidate],
    );

    const fullCandidatePath = resolveProjectStoragePath(projectId, candidate);
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

const getFileForDownload = async (fileId, ownerId) => {
  const result = await pool.query(
    `
    SELECT
        f.id,
        f.project_id,
        f.original_name,
        f.relative_path,
        f.mime_type
    FROM files f
    INNER JOIN projects p
        ON p.id = f.project_id
    WHERE
        f.id = $1
    AND
        p.owner_id = $2
    `,
    [fileId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

  const file = result.rows[0];

  const storagePath = resolveProjectStoragePath(
    file.project_id,
    file.relative_path,
  );

  return {
    id: file.id,
    original_name: file.original_name,
    storage_path: storagePath,
    mime_type: file.mime_type,
  };
};

const deletePaths = async (projectId, ownerId, items, permanent = false) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected.");
    error.status = 400;
    throw error;
  }

  for (const item of items) {
    const relativePath = item.relativePath || item.path;
    if (!relativePath || !item.type) {
      continue;
    }

    await deletePath(projectId, ownerId, relativePath, item.type, permanent);
  }

  return {
    success: true,
    count: items.length,
  };
};

const createDownloadArchive = async (projectId, items, output) => {
  const archive = new ZipArchive({
    zlib: { level: 9 },
  });

  archive.on("error", (error) => {
    output.destroy(error);
  });

  archive.pipe(output);

  for (const item of items) {
    const storagePath = resolveProjectStoragePath(projectId, item.relative_path);

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

const downloadPaths = async (projectId, ownerId, items) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected.");
    error.status = 400;
    throw error;
  }

  const validItems = [];

  for (const item of items) {
    const relativePath = item.path || item.relativePath || item.file?.relative_path;

    if (!relativePath) {
      continue;
    }

    const result = await pool.query(
      `
      SELECT *
      FROM files
      WHERE project_id = $1
        AND relative_path = $2
      `,
      [projectId, relativePath],
    );

    if (result.rows.length === 0) {
      const folderRes = await pool.query(
        `SELECT * FROM files WHERE project_id = $1 AND (relative_path = $2 OR relative_path LIKE $3) LIMIT 1`,
        [projectId, relativePath, `${relativePath}/%`],
      );
      if (folderRes.rows.length > 0) {
        validItems.push({
          relative_path: relativePath,
          original_name: relativeBasename(relativePath),
          is_directory: true,
        });
        continue;
      }
      continue;
    }

    validItems.push(result.rows[0]);
  }

  return validItems;
};

const getProjectStats = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    `
    SELECT
      COUNT(CASE WHEN is_directory = FALSE THEN 1 END) AS total_files,
      COUNT(CASE WHEN is_directory = TRUE THEN 1 END) AS total_folders,
      COALESCE(SUM(CASE WHEN is_directory = FALSE THEN file_size ELSE 0 END), 0) AS total_bytes
    FROM files
    WHERE project_id = $1
    `,
    [projectId],
  );

  const stats = result.rows[0];
  return {
    totalFiles: parseInt(stats.total_files, 10) || 0,
    totalFolders: parseInt(stats.total_folders, 10) || 0,
    totalBytes: parseInt(stats.total_bytes, 10) || 0,
    projectId,
  };
};

const extractArchive = async (projectId, ownerId, relativePath, destination = "") => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const zipStoragePath = resolveProjectStoragePath(projectId, relativePath);
  const destRelative = destination ? normalizeRelativePath(destination) : relativeDirname(relativePath);
  const destStoragePath = resolveProjectStoragePath(projectId, destRelative);

  await filesystem.ensureDirectory(destStoragePath);

  const zip = new AdmZip(zipStoragePath);
  const zipEntries = zip.getEntries();

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

    const entryStoragePath = resolveProjectStoragePath(projectId, entryRelative);

    if (entry.isDirectory) {
      await pool.query(
        `
        INSERT INTO files
        (project_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
        VALUES ($1, $2, $3, $4, 'directory', 0, $5, TRUE)
        ON CONFLICT DO NOTHING
        `,
        [projectId, relativeBasename(entryRelative), entryRelative, relativeBasename(entryRelative), entryStoragePath],
      );
    } else {
      const existing = await pool.query(
        `SELECT id, file_size FROM files WHERE project_id = $1 AND relative_path = $2`,
        [projectId, entryRelative],
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE files SET file_size = $1, storage_path = $2 WHERE id = $3`,
          [entry.header.size, entryStoragePath, existing.rows[0].id],
        );
      } else {
        await pool.query(
          `
          INSERT INTO files
          (project_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
          VALUES ($1, $2, $3, $4, 'application/octet-stream', $5, $6, FALSE)
          `,
          [projectId, relativeBasename(entryRelative), entryRelative, relativeBasename(entryRelative), entry.header.size, entryStoragePath],
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

const getProjectTrash = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    `
    SELECT
      id,
      original_name,
      relative_path,
      file_size,
      mime_type,
      is_directory,
      deleted_at
    FROM files
    WHERE project_id = $1
      AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
    `,
    [projectId],
  );

  return result.rows;
};

const restoreProjectParentDirectories = async (projectId, relativePath) => {
  if (!relativePath) return;
  const parts = String(relativePath).split("/").filter(Boolean);
  if (parts.length <= 1) return;

  const parentPaths = [];
  let cur = "";
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur ? `${cur}/${parts[i]}` : parts[i];
    parentPaths.push(cur);
  }

  if (parentPaths.length > 0) {
    await pool.query(
      `
      UPDATE files
      SET deleted_at = NULL
      WHERE project_id = $1
        AND relative_path = ANY($2::text[])
      `,
      [projectId, parentPaths],
    );
  }
};

const restoreProjectTrash = async (projectId, ownerId, fileId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const fileRes = await pool.query(
    `SELECT * FROM files WHERE id = $1 AND project_id = $2`,
    [fileId, projectId],
  );
  if (fileRes.rows.length === 0) {
    const error = new Error("File not found in trash");
    error.status = 404;
    throw error;
  }
  const file = fileRes.rows[0];

  if (file.is_directory) {
    const dirPrefix = file.relative_path.endsWith("/")
      ? file.relative_path
      : `${file.relative_path}/`;

    const result = await pool.query(
      `
      UPDATE files
      SET deleted_at = NULL
      WHERE project_id = $1
        AND (relative_path = $2 OR relative_path LIKE $3)
      RETURNING *
      `,
      [projectId, file.relative_path, `${dirPrefix}%`],
    );
    await restoreProjectParentDirectories(projectId, file.relative_path);
    return { success: true, restored: result.rows };
  }

  const result = await pool.query(
    `
    UPDATE files
    SET deleted_at = NULL
    WHERE id = $1 AND project_id = $2
    RETURNING *
    `,
    [fileId, projectId],
  );
  await restoreProjectParentDirectories(projectId, file.relative_path);
  return { success: true, restored: result.rows[0] };
};

const emptyProjectTrash = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    `
    DELETE FROM files
    WHERE project_id = $1 AND deleted_at IS NOT NULL
    RETURNING id, relative_path, file_size, storage_path, is_directory
    `,
    [projectId],
  );

  const trashed = result.rows;
  let totalBytesFreed = 0;

  for (const file of trashed) {
    const storagePath = resolveProjectStoragePath(projectId, file.relative_path);
    if (file.is_directory) {
      try {
        await fs.rm(storagePath, { recursive: true, force: true });
      } catch (err) {
        console.warn("Could not delete trashed folder from disk:", storagePath, err.message);
      }
    } else {
      try {
        await filesystem.removeDiskFile(storagePath);
      } catch (err) {
        console.warn("Could not delete trashed file from disk:", storagePath, err.message);
      }
      totalBytesFreed += Number(file.file_size || 0);
    }
  }

  if (totalBytesFreed > 0) {
    await storageAllocation.releaseStorage(ownerId, totalBytesFreed);
  }

  return {
    success: true,
    purgedCount: trashed.length,
    freedBytes: totalBytesFreed,
  };
};

const compressProjectPaths = async (
  projectId,
  ownerId,
  items,
  zipName = "archive.zip",
  destination = "",
) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

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
  const targetDiskPath = resolveProjectStoragePath(projectId, targetRelative);

  const zip = new AdmZip();
  for (const item of items) {
    const rel = normalizeRelativePath(
      item.relativePath || item.path || item.relative_path || "",
    );
    if (!rel) continue;
    const isDir =
      item.isDirectory !== undefined ? item.isDirectory : item.type === "folder";
    const itemDiskPath = resolveProjectStoragePath(projectId, rel);
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
    `SELECT id FROM files WHERE project_id = $1 AND relative_path = $2`,
    [projectId, targetRelative],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE files SET file_size = $1, storage_path = $2, deleted_at = NULL, updated_at = NOW() WHERE id = $3`,
      [buffer.length, targetDiskPath, existing.rows[0].id],
    );
  } else {
    await pool.query(
      `INSERT INTO files
       (project_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
       VALUES ($1, $2, $3, $4, 'application/zip', $5, $6, FALSE)`,
      [
        projectId,
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

const searchProjectFiles = async (projectId, ownerId, query) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

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
    FROM files
    WHERE project_id = $1
      AND deleted_at IS NULL
      AND (original_name ILIKE $2 OR relative_path ILIKE $2)
    ORDER BY is_directory DESC, original_name ASC
    LIMIT 100
    `,
    [projectId, searchTerm],
  );

  return result.rows;
};

const exportProjectToCloud = async (
  projectId,
  ownerId,
  items,
  destination = "",
) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected for export");
    error.status = 400;
    throw error;
  }

  await workspace.ensureCloudWorkspace(ownerId);
  const destFolder = destination ? normalizeRelativePath(destination) : "";
  let transferredCount = 0;

  for (const item of items) {
    const srcRelative = normalizeRelativePath(
      item.relativePath || item.path || item.relative_path || "",
    );
    if (!srcRelative) continue;
    const isDir =
      item.isDirectory !== undefined ? item.isDirectory : item.type === "folder";
    const srcStorage = resolveProjectStoragePath(projectId, srcRelative);
    const bName = relativeBasename(srcRelative);
    const targetRelative = destFolder ? relativeJoin(destFolder, bName) : bName;
    const targetStorage = resolveCloudStoragePath(ownerId, targetRelative);

    if (isDir) {
      const folderSize = await filesystem.calculateDirectorySize(srcStorage);
      await storageAllocation.checkQuota(ownerId, folderSize);
      await filesystem.copyDirectory(srcStorage, targetStorage);

      const rows = await pool.query(
        `SELECT * FROM files WHERE project_id = $1 AND (relative_path = $2 OR relative_path LIKE $3) AND deleted_at IS NULL`,
        [projectId, srcRelative, `${srcRelative}/%`],
      );

      for (const row of rows.rows) {
        const subRel =
          row.relative_path === srcRelative
            ? targetRelative
            : targetRelative + row.relative_path.substring(srcRelative.length);
        const subStorage = resolveCloudStoragePath(ownerId, subRel);
        await pool.query(
          `INSERT INTO cloud_files
           (owner_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [
            ownerId,
            relativeBasename(subRel),
            subRel,
            relativeBasename(subRel),
            row.mime_type,
            row.file_size,
            subStorage,
            row.is_directory,
          ],
        );
      }
      await storageAllocation.reserveStorage(ownerId, folderSize);
      transferredCount++;
    } else {
      const stats = await fs.stat(srcStorage).catch(() => ({ size: 0 }));
      const fileSize = stats.size;
      await storageAllocation.checkQuota(ownerId, fileSize);
      await filesystem.copyFile(srcStorage, targetStorage);

      const origRes = await pool.query(
        `SELECT * FROM files WHERE project_id = $1 AND relative_path = $2`,
        [projectId, srcRelative],
      );
      const orig = origRes.rows[0] || {};

      await pool.query(
        `INSERT INTO cloud_files
         (owner_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
         ON CONFLICT (owner_id, relative_path) DO UPDATE
         SET file_size = EXCLUDED.file_size, storage_path = EXCLUDED.storage_path, deleted_at = NULL, updated_at = NOW()`,
        [
          ownerId,
          bName,
          targetRelative,
          bName,
          orig.mime_type || "application/octet-stream",
          fileSize,
          targetStorage,
        ],
      );
      await storageAllocation.reserveStorage(ownerId, fileSize);
      transferredCount++;
    }
  }

  return { success: true, count: transferredCount };
};

const importCloudToProject = async (
  projectId,
  ownerId,
  items,
  destination = "",
) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected for import");
    error.status = 400;
    throw error;
  }

  const destFolder = destination ? normalizeRelativePath(destination) : "";
  let transferredCount = 0;

  for (const item of items) {
    const srcRelative = normalizeRelativePath(
      item.relativePath || item.path || item.relative_path || "",
    );
    if (!srcRelative) continue;
    const isDir =
      item.isDirectory !== undefined ? item.isDirectory : item.type === "folder";
    const srcStorage = resolveCloudStoragePath(ownerId, srcRelative);
    const bName = relativeBasename(srcRelative);
    const targetRelative = destFolder ? relativeJoin(destFolder, bName) : bName;
    const targetStorage = resolveProjectStoragePath(projectId, targetRelative);

    if (isDir) {
      const folderSize = await filesystem.calculateDirectorySize(srcStorage);
      await storageAllocation.checkQuota(ownerId, folderSize);
      await filesystem.copyDirectory(srcStorage, targetStorage);

      const rows = await pool.query(
        `SELECT * FROM cloud_files WHERE owner_id = $1 AND (relative_path = $2 OR relative_path LIKE $3) AND deleted_at IS NULL`,
        [ownerId, srcRelative, `${srcRelative}/%`],
      );

      for (const row of rows.rows) {
        const subRel =
          row.relative_path === srcRelative
            ? targetRelative
            : targetRelative + row.relative_path.substring(srcRelative.length);
        const subStorage = resolveProjectStoragePath(projectId, subRel);
        await pool.query(
          `INSERT INTO files
           (project_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [
            projectId,
            relativeBasename(subRel),
            subRel,
            relativeBasename(subRel),
            row.mime_type,
            row.file_size,
            subStorage,
            row.is_directory,
          ],
        );
      }
      await storageAllocation.reserveStorage(ownerId, folderSize);
      transferredCount++;
    } else {
      const stats = await fs.stat(srcStorage).catch(() => ({ size: 0 }));
      const fileSize = stats.size;
      await storageAllocation.checkQuota(ownerId, fileSize);
      await filesystem.copyFile(srcStorage, targetStorage);

      const origRes = await pool.query(
        `SELECT * FROM cloud_files WHERE owner_id = $1 AND relative_path = $2`,
        [ownerId, srcRelative],
      );
      const orig = origRes.rows[0] || {};

      await pool.query(
        `INSERT INTO files
         (project_id, original_name, relative_path, stored_name, mime_type, file_size, storage_path, is_directory)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
         ON CONFLICT (project_id, relative_path) DO UPDATE
         SET file_size = EXCLUDED.file_size, storage_path = EXCLUDED.storage_path, deleted_at = NULL, updated_at = NOW()`,
        [
          projectId,
          bName,
          targetRelative,
          bName,
          orig.mime_type || "application/octet-stream",
          fileSize,
          targetStorage,
        ],
      );
      await storageAllocation.reserveStorage(ownerId, fileSize);
      transferredCount++;
    }
  }

  return { success: true, count: transferredCount };
};

module.exports = {
  saveFile,
  getProjectFiles,
  getFileForDownload,
  deleteFile,
  getProjectFilesForBuild,
  removeProjectDirectory,
  loadFileContent,
  updateFileContent,
  createFolder,
  createEmptyFile,
  renamePath,
  deletePath,
  deletePaths,
  createDownloadArchive,
  downloadPaths,
  getProjectStats,
  extractArchive,
  copyPath,
  cutPath,
  pastePath,
  generateDuplicatePath,
  getProjectTrash,
  restoreProjectTrash,
  emptyProjectTrash,
  compressProjectPaths,
  searchProjectFiles,
  exportProjectToCloud,
  importCloudToProject,
};
