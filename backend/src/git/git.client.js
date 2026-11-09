const simpleGit = require("simple-git");
const fs = require("fs");

const getRepository = (directory) => {
  if (directory && typeof directory === "string") {
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    } catch (err) {
      console.warn("[gitClient] Warning ensuring directory exists:", err.message);
    }
  }
  return simpleGit(directory);
};

module.exports = {
  getRepository,
};
