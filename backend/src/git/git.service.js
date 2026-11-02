const gitClient = require("./git.client");

const buildAuthUrl = (url, token) => {
  if (!url) return url;
  if (!token) return url;
  try {
    // If it's https://github.com/owner/repo.git or https://gitlab.com/owner/repo.git
    const parsed = new URL(url);
    parsed.username = "x-access-token";
    parsed.password = token;
    return parsed.toString();
  } catch {
    return url;
  }
};

async function setAuthRemote(directory, remoteUrl, token) {
  if (!remoteUrl) return;
  const git = gitClient.getRepository(directory);
  const authUrl = buildAuthUrl(remoteUrl, token);
  try {
    const remotes = await git.getRemotes();
    const hasOrigin = remotes.some((r) => r.name === "origin");
    if (hasOrigin) {
      await git.remote(["set-url", "origin", authUrl]);
    } else {
      await git.addRemote("origin", authUrl);
    }
  } catch (err) {
    console.warn("[Git] Could not set remote URL:", err.message);
  }
}

async function pull(directory) {
  const git = gitClient.getRepository(directory);
  const branchInfo = await git.branch();
  const branch = branchInfo.current || "main";
  return git.pull("origin", branch);
}

async function push(directory) {
  const git = gitClient.getRepository(directory);
  const branchInfo = await git.branch();
  const branch = branchInfo.current || "main";
  return git.push("origin", branch);
}

async function fetch(directory) {
  const git = gitClient.getRepository(directory);
  return git.fetch(["--all", "--prune"]);
}

async function status(directory) {
  const git = gitClient.getRepository(directory);
  return git.status();
}

async function commit(directory, message) {
  const git = gitClient.getRepository(directory);
  await git.add(".");
  return git.commit(message);
}

async function resetHard(directory, branch) {
  const git = gitClient.getRepository(directory);
  await git.fetch("origin");
  await git.reset(["--hard", `origin/${branch}`]);
  await git.clean("f", ["-d"]);
}

async function log(directory, limit = 10) {
  const git = gitClient.getRepository(directory);
  try {
    const logResult = await git.log({ maxCount: limit });
    return logResult.all.map((c) => ({
      hash: c.hash,
      shortHash: c.hash.slice(0, 7),
      date: c.date,
      message: c.message,
      author_name: c.author_name,
      author_email: c.author_email,
    }));
  } catch (err) {
    return [];
  }
}

async function branches(directory) {
  const git = gitClient.getRepository(directory);
  try {
    const branchSummary = await git.branch(["-a"]);
    // Clean branch names (strip remotes/origin/)
    const uniqueBranches = new Set();
    uniqueBranches.add(branchSummary.current);

    for (const b of branchSummary.all) {
      const clean = b.replace(/^remotes\/origin\//, "").replace(/^origin\//, "");
      if (clean && !clean.includes("HEAD")) {
        uniqueBranches.add(clean);
      }
    }

    return {
      current: branchSummary.current,
      all: Array.from(uniqueBranches),
    };
  } catch (err) {
    return { current: "main", all: ["main"] };
  }
}

async function diff(directory, file = null) {
  const git = gitClient.getRepository(directory);
  try {
    if (file) {
      return await git.diff([file]);
    }
    return await git.diff();
  } catch (err) {
    return "";
  }
}

async function checkout(directory, branch) {
  const git = gitClient.getRepository(directory);
  return git.checkout(branch);
}

module.exports = {
  buildAuthUrl,
  setAuthRemote,
  pull,
  push,
  fetch,
  status,
  commit,
  resetHard,
  log,
  branches,
  diff,
  checkout,
};
