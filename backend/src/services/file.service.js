const { pool } = require("../config/database");
const fs = require("fs/promises");
const path = require("path");

const { PROJECTS_ROOT } = require("../config/app.config");
const { verifyProjectOwnership } = require("./project.service");
const { getProjectFilesDirectory } = require("../storage/storage.manager");

const saveFile = async (projectId, ownerId, file) => {
  //
  // Verify project ownership
  //
  await verifyProjectOwnership(projectId, ownerId);

  const existing = await pool.query(
    `
  SELECT
      id,
      stored_name,
      storage_path
  FROM files
  WHERE
      project_id = $1
  AND
      original_name = $2
  `,
    [projectId, file.originalname],
  );

  const projectDirectory = getProjectFilesDirectory(projectId);

  await fs.mkdir(projectDirectory, {
    recursive: true,
  });

  const finalPath = path.join(projectDirectory, file.filename);

  await fs.rename(file.path, finalPath);
  //
  // Save metadata
  //
  try {
    if (existing.rows.length > 0) {
      const oldFile = existing.rows[0];

      try {
        await fs.unlink(oldFile.storage_path);
      } catch {
        // Ignore if file doesn't exist
      }

      const result = await pool.query(
        `
 UPDATE files
SET
    stored_name = $2,
    mime_type = $3,
    file_size = $4,
    storage_path = $5
WHERE id = $1
RETURNING *
  `,
        [oldFile.id, file.filename, file.mimetype, file.size, finalPath],
      );

      return result.rows[0];
    }

    const result = await pool.query(
      `
    INSERT INTO files
    (
        project_id,
        original_name,
        stored_name,
        mime_type,
        file_size,
        storage_path
    )
    VALUES
    (
        $1,$2,$3,$4,$5,$6
    )
    RETURNING *
    `,
      [
        projectId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
        finalPath,
      ],
    );

    return result.rows[0];
  } catch (error) {
    try {
      await fs.unlink(finalPath);
    } catch {}

    throw error;
  }
};

const getProjectFiles = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    ` 
       SELECT
    id,
    original_name,
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
        f.storage_path
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

    await client.query(
      `
    DELETE FROM files
    WHERE id = $1
    `,
      [fileId],
    );

    await fs.unlink(file.storage_path);

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

module.exports = {
  saveFile,
  getProjectFiles,
  getFileForDownload,
  deleteFile,
  getProjectFilesForBuild,
  removeProjectDirectory,
};
