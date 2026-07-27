const { pool } = require("../config/database");
const fs = require("fs/promises");
const path = require("path");
const storageQuotaService = require("./storageQuota.service");
const { verifyProjectOwnership } = require("./project.service");
const { getProjectFilesDirectory } = require("../storage/storage.manager");
const { syncWorkspaceToGit } = require("./workspace.sync.service");

const { getProjectGitDirectory } = require("../services/git.service");
const filesystem = require("./filesystem.service");
const workspaceFileService = require("./workspace.file.service");

const saveFile = async (projectId, ownerId, file) => {
  //
  // Verify project ownership
  //
  const { verifyProjectOwnership } = require("./project.service");

  await verifyProjectOwnership(projectId, ownerId);

  const existing = await pool.query(
    `
  SELECT
      id,
      stored_name,
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

  await storageQuotaService.checkQuota(ownerId, file.size, replacingBytes);

  const workspaceRoot = getProjectFilesDirectory(projectId);

  await filesystem.ensureDirectory(workspaceRoot);

  const relativePath = file.relativePath || file.originalname;

  const finalPath = await workspaceFileService.storeUploadedFile({
    workspaceRoot,
    uploadedFile: file,
    relativePath,
  });
  //
  // Save metadata
  //
  try {
    if (existing.rows.length > 0) {
      const oldFile = existing.rows[0];

      try {
        await filesystem.removeDiskFile(oldFile.storage_path);
      } catch {
        // Ignore if file doesn't exist
      }

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
          finalPath,
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
        finalPath,
      ],
    );

    return result.rows[0];
  } catch (error) {
    try {
      await filesystem.removeDiskFile(finalPath);
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
    stored_name,
    storage_path
    FROM files
    WHERE project_id = $1
    `,
    [projectId],
  );

  return result.rows;
};

const getFileForDownload = async (fileId, ownerId) => {
  const result = await pool.query(
    `
        SELECT
            f.id,
            f.original_name,
            f.storage_path,
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

  return result.rows[0];
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
  const projectPath = getProjectDirectory(projectId);

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
        f.original_name,
        f.storage_path,
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

  const content = await filesystem.readContent(file.storage_path, "utf8");

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
        f.storage_path,
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
  console.log("Saving file:", result.rows[0].storage_path);

  const project = await pool.query(
    `
  SELECT project_id
  FROM files
  WHERE id = $1
  `,
    [fileId],
  );

  console.log(
    "Git directory:",
    getProjectGitDirectory(project.rows[0].project_id),
  );

  console.log(
    "Workspace directory:",
    getProjectFilesDirectory(project.rows[0].project_id),
  );

  const oldSize = Number(result.rows[0].file_size);

  const newSize = Buffer.byteLength(content, "utf8");

  await storageQuotaService.checkQuota(ownerId, newSize, oldSize);
  await filesystem.writeContent(result.rows[0].storage_path, content, "utf8");

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

  const file = await pool.query(
    `
    SELECT project_id
    FROM files
    WHERE id = $1
    `,
    [fileId],
  );

  await syncWorkspaceToGit(file.rows[0].project_id);
  console.log(
    ".git exists after sync:",
    await fs
      .access(
        path.join(getProjectGitDirectory(file.rows[0].project_id), ".git"),
      )
      .then(() => true)
      .catch(() => false),
  );
  return {
    success: true,
  };
};

const renamePath = async (projectId, ownerId, oldPath, newPath, type) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const workspaceRoot = getProjectFilesDirectory(projectId);

  const oldStoragePath = path.join(workspaceRoot, oldPath);
  const newStoragePath = path.join(workspaceRoot, newPath);

  await filesystem.ensureDirectory(path.dirname(newStoragePath));

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
      [projectId, newPath, path.basename(newPath), newStoragePath, oldPath],
    );

    return;
  }

  //
  // Folder
  //

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

    const updatedStorage = path.join(workspaceRoot, updatedRelative);

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
        path.basename(updatedRelative),
      ],
    );
  }
};

const createFolder = async (projectId, ownerId, relativePath) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const workspaceRoot = getProjectFilesDirectory(projectId);

  const folderPath = path.join(workspaceRoot, relativePath);

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
    [projectId, path.basename(relativePath), relativePath, folderPath],
  );

  return {
    relativePath,
  };
};

const createEmptyFile = async (projectId, ownerId, relativePath) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const workspaceRoot = getProjectFilesDirectory(projectId);

  const fullPath = path.join(workspaceRoot, relativePath);

  await filesystem.ensureDirectory(path.dirname(fullPath));

  await filesystem.writeContent(fullPath, "");

  const originalName = path.basename(relativePath);

  const storedName = originalName;

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
      storedName,
      "text/plain",
      0,
      fullPath,
    ],
  );

  return result.rows[0];
};

const deletePath = async (projectId, ownerId, relativePath, type) => {
  console.log("Delete request:");
  console.log({
    relativePath,
    type,
    relativePathType: typeof relativePath,
  });
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const workspaceRoot = getProjectFilesDirectory(projectId);

  if (type === "file") {
    const file = await pool.query(
      `
      SELECT *
      FROM files
      WHERE
          project_id=$1
      AND
          relative_path=$2
      `,
      [projectId, relativePath],
    );

    if (file.rows.length === 0) throw new Error("File not found");

    await filesystem.removeDiskFile(file.rows[0].storage_path);

    await pool.query(
      `
      DELETE FROM files
      WHERE id=$1
      `,
      [file.rows[0].id],
    );

    return;
  }

  // folder

  const folderPath = path.join(workspaceRoot, relativePath);

  await fs.rm(folderPath, {
    recursive: true,
    force: true,
  });

  await pool.query(
    `
    DELETE FROM files
    WHERE
        project_id=$1
    AND
        relative_path LIKE $2
    `,
    [projectId, `${relativePath}%`],
  );
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
};
