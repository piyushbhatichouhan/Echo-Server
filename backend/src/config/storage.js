const path = require("path");

const ROOT = process.cwd();

module.exports = {
  projects: process.env.PROJECTS_PATH || path.join(ROOT, "storage", "projects"),

  git: process.env.GIT_PATH || path.join(ROOT, "storage", "git"),

  cloud: process.env.CLOUD_PATH || path.join(ROOT, "storage", "cloud"),

  backups: process.env.BACKUPS_PATH || path.join(ROOT, "storage", "backups"),

  published:
    process.env.PUBLISHED_PATH || path.join(ROOT, "storage", "published"),

  nginx: {
    executable: process.env.NGINX_EXECUTABLE || "D:/nginx/nginx.exe",

    configDirectory:
      process.env.NGINX_CONFIG_DIRECTORY || "D:/nginx/conf/echohub",
  },
};
