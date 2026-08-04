const gitClient = require("./git.client");

async function pull(directory) {
  const git = gitClient.getRepository(directory);

  const branch = (await git.branch()).current;

  return git.pull("origin", branch);
}

async function push(directory) {
  const git = gitClient.getRepository(directory);

  const branch = (await git.branch()).current;

  return git.push("origin", branch);
}

async function fetch(directory) {
  const git = gitClient.getRepository(directory);

  return git.fetch("origin");
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

module.exports = {
  pull,
  push,
  fetch,
  status,
  commit,
  resetHard,
};
