const path = require("path");
const fs = require("fs/promises");
const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"),
);
const getGitRoot = (projectId) => {
  return path.join(STORAGE_ROOT, "git", projectId.toString());
};
const ensureGitRoot = async (projectId) => {
  const root = getGitRoot(projectId);
  await fs.mkdir(root, { recursive: true });
  return root;
};
module.exports = { STORAGE_ROOT, getGitRoot, ensureGitRoot };
