const GITHUB_API = "https://api.github.com";
const simpleGit = require("simple-git");
const fs = require("fs/promises");

const getHeaders = (token) => {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "EchoHub-Server",
  };
  const activeToken = token || process.env.GITHUB_TOKEN;
  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }
  return headers;
};

const getRepository = async (owner, repo, token = null) => {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: getHeaders(token),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found or private. Provide a Personal Access Token if private.");
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please configure a GitHub Token.");
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return response.json();
};

const getBranch = async (owner, repo, branch, token = null) => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`,
    {
      headers: getHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(`Branch "${branch}" not found in repository.`);
  }

  return response.json();
};

const cloneRepository = async (cloneUrl, branch, destination, token = null) => {
  await fs.rm(destination, {
    recursive: true,
    force: true,
  });

  let targetUrl = cloneUrl;
  const activeToken = token || process.env.GITHUB_TOKEN;
  if (activeToken && targetUrl.startsWith("https://")) {
    try {
      const u = new URL(targetUrl);
      u.username = "x-access-token";
      u.password = activeToken;
      targetUrl = u.toString();
    } catch {}
  }

  const git = simpleGit();

  await git.clone(targetUrl, destination, [
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
