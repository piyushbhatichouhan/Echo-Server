const GITHUB_API = "https://api.github.com";
const simpleGit = require("simple-git");
const fs = require("fs/promises");

const getRepository = async (owner, repo) => {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`);

  if (!response.ok) {
    throw new Error("Repository not found");
  }

  return response.json();
};

const getBranch = async (owner, repo, branch) => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`,
  );

  if (!response.ok) {
    throw new Error("Branch not found");
  }

  return response.json();
};

const cloneRepository = async (cloneUrl, branch, destination) => {
  await fs.rm(destination, {
    recursive: true,
    force: true,
  });

  const git = simpleGit();

  await git.clone(cloneUrl, destination, [
    "--branch",
    branch,
    "--single-branch",
  ]);
};

module.exports = {
  getRepository,
  getBranch,
  cloneRepository,
};
