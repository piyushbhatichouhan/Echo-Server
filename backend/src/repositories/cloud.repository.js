const { pool } = require("../config/database");

const getCloudFiles = async (ownerId) => {
  const result = await pool.query(
    `
    SELECT
        id,
        original_name,
        relative_path,
        stored_name,
        mime_type,
        file_size,
        storage_path,
        is_directory,
        created_at
    FROM cloud_files
    WHERE
        owner_id = $1
    AND
        deleted_at IS NULL
    ORDER BY created_at DESC
    `,
    [ownerId],
  );

  return result.rows;
};

const getCloudFileByPath = async (ownerId, relativePath) => {
  const result = await pool.query(
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
    [ownerId, relativePath],
  );

  return result.rows[0];
};

const createCloudFile = async (data) => {
  const result = await pool.query(
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
    ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      data.ownerId,
      data.originalName,
      data.relativePath,
      data.storedName,
      data.mimeType,
      data.fileSize,
      data.storagePath,
      data.isDirectory,
    ],
  );

  return result.rows[0];
};

const updateCloudFile = async (id, data) => {
  const result = await pool.query(
    `
    UPDATE cloud_files
    SET
        relative_path=$2,
        original_name=$3,
        stored_name=$4,
        mime_type=$5,
        file_size=$6,
        storage_path=$7,
        updated_at=NOW()
    WHERE id=$1
    RETURNING *
    `,
    [
      id,
      data.relativePath,
      data.originalName,
      data.storedName,
      data.mimeType,
      data.fileSize,
      data.storagePath,
    ],
  );

  return result.rows[0];
};

const deleteCloudFile = async (id) => {
  await pool.query(
    `
    DELETE FROM cloud_files
    WHERE id=$1
    `,
    [id],
  );
};

const deleteFolder = async (ownerId, folderPath) => {
  const result = await pool.query(
    `
    DELETE FROM cloud_files
    WHERE owner_id = $1
      AND (
        relative_path = $2
        OR relative_path LIKE $3
      )
    RETURNING
      id,
      relative_path,
      file_size,
      storage_path,
      is_directory;
    `,
    [ownerId, folderPath, `${folderPath}/%`],
  );

  return result.rows;
};

const softDeleteCloudFile = async (id, ownerId) => {
  const result = await pool.query(
    `
    UPDATE cloud_files
    SET deleted_at = NOW()
    WHERE id = $1 AND owner_id = $2
    RETURNING *
    `,
    [id, ownerId],
  );
  return result.rows[0];
};

const softDeleteFolder = async (ownerId, folderPath) => {
  const result = await pool.query(
    `
    UPDATE cloud_files
    SET deleted_at = NOW()
    WHERE owner_id = $1
      AND (relative_path = $2 OR relative_path LIKE $3)
    RETURNING id, relative_path, file_size, storage_path, is_directory
    `,
    [ownerId, folderPath, `${folderPath}/%`],
  );
  return result.rows;
};

const getTrashFiles = async (ownerId) => {
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
    FROM cloud_files
    WHERE owner_id = $1
      AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
    `,
    [ownerId],
  );
  return result.rows;
};

const restoreTrashFile = async (id, ownerId) => {
  const fileRes = await pool.query(
    `SELECT * FROM cloud_files WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  );
  if (fileRes.rows.length === 0) return null;
  const file = fileRes.rows[0];

  if (file.is_directory) {
    const result = await pool.query(
      `
      UPDATE cloud_files
      SET deleted_at = NULL
      WHERE owner_id = $1
        AND (relative_path = $2 OR relative_path LIKE $3)
      RETURNING *
      `,
      [ownerId, file.relative_path, `${file.relative_path}/%`],
    );
    return result.rows;
  }

  const result = await pool.query(
    `
    UPDATE cloud_files
    SET deleted_at = NULL
    WHERE id = $1 AND owner_id = $2
    RETURNING *
    `,
    [id, ownerId],
  );
  return result.rows[0];
};

const purgeTrashFiles = async (ownerId) => {
  const result = await pool.query(
    `
    DELETE FROM cloud_files
    WHERE owner_id = $1 AND deleted_at IS NOT NULL
    RETURNING id, relative_path, file_size, storage_path, is_directory
    `,
    [ownerId],
  );
  return result.rows;
};

module.exports = {
  getCloudFiles,
  getCloudFileByPath,
  createCloudFile,
  updateCloudFile,
  deleteCloudFile,
  deleteFolder,
  softDeleteCloudFile,
  softDeleteFolder,
  getTrashFiles,
  restoreTrashFile,
  purgeTrashFiles,
};
