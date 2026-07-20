const { pool } = require("../config/database");
const { verifyProjectOwnership } = require("./project.service");
const github = require("../utils/github.api");
const path = require("path");
const fs = require("fs/promises");
const { getProjectFilesDirectory } = require("../storage/storage.manager");

const {
  syncGitToWorkspace,
  indexWorkspace,
  syncWorkspaceToGit,
} = require("./workspace.sync.service");
const simpleGit = require("simple-git");

const getRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    `
    SELECT *
    FROM project_repository
    WHERE project_id=$1
    `,
    [projectId],
  );

  return result.rows[0] ?? null;
};

const validateRepository = async (projectId, ownerId, url, branch) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);

  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = match[1];
  const repository = match[2];

  const repo = await github.getRepository(owner, repository);

  const branchInfo = await github.getBranch(owner, repository, branch);

  return {
    valid: true,

    owner,

    name: repository,

    defaultBranch: repo.default_branch,

    visibility: repo.private ? "Private" : "Public",

    cloneUrl: repo.clone_url,

    description: repo.description,

    branch: branchInfo.name,
  };
};
const connectRepository = async (projectId, ownerId, repositoryUrl, branch) => {
  console.log({
    projectId,
    ownerId,
    repositoryUrl,
    branch,
  });
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const match = repositoryUrl.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/,
  );

  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = match[1];
  const repositoryName = match[2];

  const repo = await github.getRepository(owner, repositoryName);

  const selectedBranch = branch || repo.default_branch;

  const existing = await pool.query(
    `
    SELECT id
    FROM project_repository
    WHERE project_id = $1
    `,
    [projectId],
  );

  if (existing.rows.length > 0) {
    const result = await pool.query(
      `
      UPDATE project_repository
      SET
          provider=$2,
          owner=$3,
          repository_name=$4,
          repository_url=$5,
          clone_url=$6,
          default_branch=$7,
          branch=$8
      WHERE project_id=$1
      RETURNING *
      `,
      [
        projectId,
        "github",
        owner,
        repositoryName,
        repositoryUrl,
        repo.clone_url,
        repo.default_branch,
        selectedBranch,
      ],
    );

    return result.rows[0];
  }

  const result = await pool.query(
    `
    INSERT INTO project_repository
    (
        project_id,
        provider,
        owner,
        repository_name,
        repository_url,
        clone_url,
        default_branch,
        branch
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      projectId,
      "github",
      owner,
      repositoryName,
      repositoryUrl,
      repo.clone_url,
      repo.default_branch,
      selectedBranch,
    ],
  );

  return result.rows[0];
};

const disconnectRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  await pool.query(
    `
        DELETE
        FROM project_repository
        WHERE project_id = $1
        `,
    [projectId],
  );
};

const GIT_ROOT = path.join(process.cwd(), "storage", "git");

const getProjectGitDirectory = (projectId) => {
  return path.join(GIT_ROOT, projectId);
};

const cloneRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");

  const {
    syncGitToWorkspace,
    indexWorkspace,
  } = require("./workspace.sync.service");

  // Verify ownership
  await verifyProjectOwnership(projectId, ownerId);

  // Load connected repository
  const result = await pool.query(
    `
    SELECT *
    FROM project_repository
    WHERE project_id = $1
    `,
    [projectId],
  );

  if (result.rows.length === 0) {
    throw new Error("Repository not connected");
  }

  const repository = result.rows[0];

  const gitDirectory = getProjectGitDirectory(projectId);

  await github.cloneRepository(
    repository.clone_url,
    repository.branch,
    gitDirectory,
  );

  await syncGitToWorkspace(projectId);

  await indexWorkspace(projectId);

  return {
    success: true,
  };
};

const copyDirectory = async (source, destination) => {
  await fs.mkdir(destination, {
    recursive: true,
  });

  const entries = await fs.readdir(source, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    // Never copy Git metadata
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
};

const getGitStatus = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);

  if (!repository) {
    const error = new Error("Repository not connected");
    error.status = 404;
    throw error;
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  const git = simpleGit(gitDirectory);

  const status = await git.status();

  const changes = [];

  for (const file of status.modified) {
    changes.push({
      path: file,
      status: "modified",
    });
  }

  for (const file of status.created) {
    changes.push({
      path: file,
      status: "created",
    });
  }

  for (const file of status.deleted) {
    changes.push({
      path: file,
      status: "deleted",
    });
  }

  for (const file of status.renamed) {
    changes.push({
      path: file.to,
      oldPath: file.from,
      status: "renamed",
    });
  }

  for (const file of status.not_added) {
    changes.push({
      path: file,
      status: "untracked",
    });
  }

  return {
    branch: status.current,

    ahead: status.ahead,

    behind: status.behind,

    clean: status.isClean(),

    changes,
  };
};

const commitChanges = async (projectId, ownerId, message) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);

  const gitDirectory = getProjectGitDirectory(projectId);

  const git = simpleGit(gitDirectory);

  await git.add(".");

  const result = await git.commit(message);

  return result;
};

const updateRepository = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);

  if (!repository) {
    throw new Error("Repository not connected");
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  const git = simpleGit(gitDirectory);

  console.log("Fetching latest changes...");

  await git.fetch("origin");

  console.log("Resetting to latest commit...");

  await git.reset(["--hard", `origin/${repository.branch}`]);

  console.log("Cleaning untracked files...");

  await git.clean("f", ["-d"]);

  await syncGitToWorkspace(projectId);

  await indexWorkspace(projectId);

  return {
    success: true,
  };
};

module.exports = {
  getRepository,
  validateRepository,
  connectRepository,
  disconnectRepository,
  cloneRepository,
  syncGitToWorkspace,
  syncWorkspaceToGit,
  getProjectGitDirectory,
  getGitStatus,
  commitChanges,
  copyDirectory,
  updateRepository,
};
