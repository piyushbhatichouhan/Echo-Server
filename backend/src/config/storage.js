const path = require("path");

const ROOT = process.cwd();

const platform = require("./platform");

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(ROOT, "storage");

module.exports = {
  STORAGE_ROOT,

  projects: path.join(STORAGE_ROOT, "projects"),

  git: path.join(STORAGE_ROOT, "git"),

  cloud: path.join(STORAGE_ROOT, "cloud"),

  backups: path.join(STORAGE_ROOT, "backups"),

  published: path.join(STORAGE_ROOT, "published"),

  nginx: {
    executable: process.env.NGINX_EXECUTABLE || platform.nginxExecutable,

    configDirectory:
      process.env.NGINX_CONFIG_DIRECTORY || platform.nginxConfigDirectory,
  },
};
