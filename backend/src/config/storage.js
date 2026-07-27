const path = require("path");

const ROOT = process.cwd();

module.exports = {
  projects: process.env.PROJECTS_PATH || path.join(ROOT, "storage", "projects"),

  git: process.env.GIT_PATH || path.join(ROOT, "storage", "git"),

  cloud: process.env.CLOUD_PATH || path.join(ROOT, "storage", "cloud"),

  backups: process.env.BACKUPS_PATH || path.join(ROOT, "storage", "backups"),
};
