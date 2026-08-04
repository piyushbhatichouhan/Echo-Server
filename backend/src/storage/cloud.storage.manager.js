const path = require("path");
const fs = require("fs/promises");

const CLOUD_ROOT =
  process.env.CLOUD_PATH ||
  path.join(
    process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"),
    "cloud",
  );

const getCloudRoot = (userId) => {
  return path.join(CLOUD_ROOT, userId.toString());
};

const ensureCloudRoot = async (userId) => {
  const root = getCloudRoot(userId);

  await fs.mkdir(root, {
    recursive: true,
  });

  return root;
};

module.exports = {
  CLOUD_ROOT,
  getCloudRoot,
  ensureCloudRoot,
};
