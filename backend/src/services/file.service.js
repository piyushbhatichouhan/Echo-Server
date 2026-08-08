const { pool } = require("../config/database");
const fs = require("fs/promises");
const path = require("path");
const { verifyProjectOwnership } = require("./project.service");
const {
  getProjectFilesRoot,
  resolveProjectStoragePath,
  getProjectRoot,
} = require("../storage/project.storage.manager");

//const { resolveProjectStoragePath } = require("../utils/storagePath");

const { syncWorkspaceToGit } = require("./workspace.sync.service");

const { getProjectGitDirectory } = require("../services/git.service");
const filesystem = require("./filesystem.service");
const workspaceFileService = require("./workspace.file.service");
const storageAllocation = require("./storageAllocation.service");
const {
  normalizeRelativePath,
  relativeDirname,
  relativeBasename,
  relativeExt,
  relativeJoin,
} = require("../utils/relativePath");

const saveFile = async (projectId, ownerId, file) => {
  const { verifyProjectOwnership } = require("./project.service");

  await verifyProjectOwnership(projectId, ownerId);

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
        original_name = $2
    `,
    [projectId, file.originalname],
  );

  const replacingBytes =
    existing.rows.length > 0 ? Number(existing.rows[0].file_size) : 0;

  const growth = Math.max(0, file.size - replacingBytes);

  await storageAllocation.checkQuota(ownerId, growth);

  const workspaceRoot = getProjectFilesRoot(projectId);

  await filesystem.ensureDirectory(workspaceRoot);

  const relativePath = normalizeRelativePath(
    file.relativePath || file.originalname,
  );

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
        WHERE project_id = $1
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
        f.is_directory
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

    if (file.is_directory) {
      await client.query(
        `
    DELETE FROM files
    WHERE
        project_id = $1
    AND
        relative_path LIKE $2
    `,
        [file.project_id, `${file.relative_path}%`],
      );

      await fs.rm(file.storage_path, {
        recursive: true,
        force: true,
      });
    } else {
      await client.query(
        `
    DELETE FROM files
    WHERE id = $1
    `,
        [file.id],
      );

      await filesystem.removeDiskFile(file.storage_path);
      await storageAllocation.releaseStorage(userId, file.file_size);
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
  const projectPath = getProjectRoot(projectId);

  await fs.rm(projectPath, {
    recursive: true,
    force: true,
  });
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
    storageAllocation.reserveStorage(ownerId, newSize - oldSize);
  else if (newSize < oldSize)
    storageAllocation.releaseStorage(ownerId, oldSize - newSize);

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
        relative_path LIKE $2
    `,
    [projectId, `${oldPath}%`],
  );

  for (const file of rows.rows) {
    const updatedRelative =
      newPath + file.relative_path.substring(oldPath.length);

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

const deletePath = async (projectId, ownerId, relativePath, type) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

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

    await storageAllocation.releaseStorage(ownerId, Number(file.file_size));

    await filesystem.removeDiskFile(storagePath);

    await pool.query(
      `
      DELETE FROM files
      WHERE id = $1
      `,
      [file.id],
    );

    return;
  }

  const folderPath = resolveProjectStoragePath(projectId, relativePath);

  const folderSize = await filesystem.calculateDirectorySize(folderPath);

  await storageAllocation.releaseStorage(ownerId, folderSize);

  await fs.rm(folderPath, {
    recursive: true,
    force: true,
  });

  await pool.query(
    `
    DELETE FROM files
    WHERE
        project_id = $1
    AND
        relative_path LIKE $2
    `,
    [projectId, `${relativePath}%`],
  );
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

const pastePath = async (projectId, ownerId, clipboard, destination) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const sourceRelative = clipboard.relativePath;

  const sourcePath = resolveProjectStoragePath(projectId, sourceRelative);

  const desiredRelative = relativeJoin(
    destination,
    path.basename(sourceRelative),
  );

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

      const original = file.rows[0];

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
FROM files
WHERE
    project_id = $1
AND
    relative_path LIKE $2
ORDER BY LENGTH(relative_path)
`,
        [projectId, `${sourceRelative}%`],
      );

      let totalBytes = 0;

      for (const item of rows.rows) {
        const newRelative =
          destinationRelative +
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

    if (exists.rows.length === 0) {
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
  copyPath,
  cutPath,
  pastePath,
  generateDuplicatePath,
};
