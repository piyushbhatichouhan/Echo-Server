const GITHUB_API = "https://api.github.com";
const simpleGit = require("simple-git");
const fs = require("fs/promises");

const parseGitHubUrl = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== "string") return null;
  const clean = inputUrl.trim().replace(/\/+$/, "");

  // HTTPS or HTTP: https://github.com/owner/repo(.git)
  const httpsMatch = clean.match(
    /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/i,
  );
  if (httpsMatch) {
    const owner = httpsMatch[1];
    const repo = httpsMatch[2].replace(/\.git$/i, "");
    return {
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  }

  // SSH: git@github.com:owner/repo(.git)
  const sshMatch = clean.match(
    /^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/i,
  );
  if (sshMatch) {
    const owner = sshMatch[1];
    const repo = sshMatch[2].replace(/\.git$/i, "");
    return {
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  }

  return null;
};

const getHeaders = (token) => {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "EchoServer-Server",
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
      throw new Error(
        "Repository not found or is private. If it is private, please provide a Personal Access Token (classic token with 'repo' scope or fine-grained token with Contents read access).",
      );
    }
    if (response.status === 401) {
      throw new Error(
        "Invalid or expired Personal Access Token. Please verify token permissions and expiration.",
      );
    }
    if (response.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Please provide a Personal Access Token to authenticate.",
      );
    }
    throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
  }

  return response.json();
};

const getBranch = async (owner, repo, branch, token = null) => {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    {
      headers: getHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(`Branch "${branch}" not found in repository.`);
  }

  return response.json();
};

const getBranches = async (owner, repo, token = null) => {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: getHeaders(token),
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((b) => b.name);
    }
    return [];
  } catch (err) {
    console.warn("[GitHub API] getBranches failed:", err.message);
    return [];
  }
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

  const cloneOptions = ["--single-branch"];
  if (branch) {
    cloneOptions.push("--branch", branch);
  }

  await git.clone(targetUrl, destination, cloneOptions);
};

module.exports = {
  parseGitHubUrl,
  getRepository,
  getBranch,
  getBranches,
  cloneRepository,
};
