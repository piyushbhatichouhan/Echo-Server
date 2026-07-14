const path = require("path");

const ROOT_DIRECTORY = process.cwd();

const STORAGE_ROOT =
  process.env.STORAGE_ROOT || path.join(ROOT_DIRECTORY, "storage");

const PROJECTS_ROOT = path.join(STORAGE_ROOT, "projects");

const TEMP_ROOT = path.join(STORAGE_ROOT, "temp");

const LOGS_ROOT = path.join(STORAGE_ROOT, "logs");

const BACKUPS_ROOT = path.join(STORAGE_ROOT, "backups");

const MAX_UPLOAD_SIZE =
  Number(process.env.MAX_UPLOAD_SIZE) || 100 * 1024 * 1024;

module.exports = {
  ROOT_DIRECTORY,

  STORAGE_ROOT,

  PROJECTS_ROOT,

  TEMP_ROOT,

  LOGS_ROOT,

  BACKUPS_ROOT,

  MAX_UPLOAD_SIZE,
};
