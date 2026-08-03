const fs = require("fs/promises");
const path = require("path");

const calculateDirectorySize = async (directory) => {
  let total = 0;

  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        total += await calculateDirectorySize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        total += stat.size;
      }
    }
  } catch {
    return 0;
  }

  return total;
};

const ensureDirectory = async (directory) => {
  await fs.mkdir(directory, {
    recursive: true,
  });
};

const moveUploadedFile = async (tempPath, destination) => {
  await ensureDirectory(path.dirname(destination));

  await fs.rename(tempPath, destination);
};

const removeDiskFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    console.error("Failed to delete file:");
    console.error(filePath);
    console.error(err);

    return false;
  }
};

const writeContent = async (filePath, content) => {
  await fs.writeFile(filePath, content, "utf8");
};

const readContent = async (filePath) => {
  return fs.readFile(filePath, "utf8");
};

const cleanupEmptyDirectories = async (directory, stopAt) => {
  if (directory === stopAt) {
    return;
  }

  try {
    const entries = await fs.readdir(directory);

    if (entries.length === 0) {
      await fs.rmdir(directory);

      await cleanupEmptyDirectories(path.dirname(directory), stopAt);
    }
  } catch {}
};

const copyFile = async (source, destination) => {
  await ensureDirectory(path.dirname(destination));

  await fs.copyFile(source, destination);
};

const copyDirectory = async (source, destination) => {
  await fs.cp(source, destination, {
    recursive: true,
  });
};

module.exports = {
  calculateDirectorySize,
  ensureDirectory,
  moveUploadedFile,
  removeDiskFile,
  writeContent,
  readContent,
  cleanupEmptyDirectories,
  copyFile,
  copyDirectory,
};
