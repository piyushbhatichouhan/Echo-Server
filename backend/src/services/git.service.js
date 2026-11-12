const { pool } = require("../config/database");
const { verifyProjectOwnership } = require("./project.service");
const github = require("../utils/github.api");
const path = require("path");
const fs = require("fs/promises");
const { getProjectFilesDirectory } = require("../storage/storage.manager");
const os = require("os");
const filesystem = require("./filesystem.service");
const { v4: uuid } = require("uuid");
const storageService = require("./storage.service");
const { getGitRoot } = require("../storage/git.storage.manager");

const {
  syncGitToWorkspace,
  indexWorkspace,
  syncWorkspaceToGit,
} = require("./workspace.sync.service");
const gitOperations = require("../git/git.service");
const gitClient = require("../git/git.client");
const storageAllocation = require("./storageAllocation.service");

const notConnectedError = () => {
  const err = new Error("Repository not connected");
  err.status = 404;
  err.isUserError = true;
  return err;
};

const invalidUrlError = () => {
  const err = new Error("Invalid GitHub repository URL");
  err.status = 400;
  err.isUserError = true;
  return err;
};

const checkGit = async (projectId, stage) => {
  const gitDir = path.join(getProjectGitDirectory(projectId), ".git");

  const exists = await fs
    .access(gitDir)
    .then(() => true)
    .catch(() => false);
};

const getRepository = async (projectId, ownerId) => {
  const {
    syncGitToWorkspace,
    indexWorkspace,
    syncWorkspaceToGit,
  } = require("./workspace.sync.service");
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

const validateRepository = async (projectId, ownerId, url, branch, token = null) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const parsed = github.parseGitHubUrl(url);
  if (!parsed) {
    throw invalidUrlError();
  }

  const { owner, repo: repositoryName } = parsed;
  const repo = await github.getRepository(owner, repositoryName, token);

  // Fetch all remote branches from GitHub
  const branches = await github.getBranches(owner, repositoryName, token);
  if (repo.default_branch && !branches.includes(repo.default_branch)) {
    branches.unshift(repo.default_branch);
  }

  // If user provided a branch, verify it; otherwise fallback to default branch
  let selectedBranch = (branch && branch.trim()) || repo.default_branch;
  if (!branches.includes(selectedBranch) && branches.length > 0) {
    selectedBranch = repo.default_branch;
  }

  return {
    valid: true,
    owner,
    name: repositoryName,
    defaultBranch: repo.default_branch,
    visibility: repo.private ? "Private" : "Public",
    cloneUrl: repo.clone_url || parsed.cloneUrl,
    description: repo.description,
    branch: selectedBranch,
    branches,
  };
};

const connectRepository = async (projectId, ownerId, repositoryUrl, branch, token = null) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const parsed = github.parseGitHubUrl(repositoryUrl);
  if (!parsed) {
    throw invalidUrlError();
  }

  const { owner, repo: repositoryName, cloneUrl: defaultCloneUrl } = parsed;
  const repo = await github.getRepository(owner, repositoryName, token);

  const selectedBranch = (branch && branch.trim()) || repo.default_branch;
  const cloneUrl = repo.clone_url || defaultCloneUrl;

  const existing = await pool.query(
    `
    SELECT id, repository_url, clone_url
    FROM project_repository
    WHERE project_id = $1
    `,
    [projectId],
  );

  let isDifferentRepo = false;

  if (existing.rows.length > 0) {
    const prev = existing.rows[0];
    const prevNorm = prev.repository_url ? prev.repository_url.trim().toLowerCase() : "";
    const prevClone = prev.clone_url ? prev.clone_url.trim().toLowerCase() : "";
    const newNorm = parsed.normalizedUrl.trim().toLowerCase();
    const newClone = cloneUrl.trim().toLowerCase();
    if ((prevNorm && prevNorm !== newNorm) || (prevClone && prevClone !== newClone)) {
      isDifferentRepo = true;
    }
  } else {
    // Check if the project previously had a different git_remote_url stored in projects table
    const projRes = await pool.query(
      `SELECT git_remote_url FROM projects WHERE id = $1`,
      [projectId],
    );
    const prevRemote = projRes.rows[0]?.git_remote_url ? projRes.rows[0].git_remote_url.trim().toLowerCase() : "";
    const newNorm = parsed.normalizedUrl.trim().toLowerCase();
    const newClone = cloneUrl.trim().toLowerCase();
    if (prevRemote && prevRemote !== newNorm && prevRemote !== newClone) {
      isDifferentRepo = true;
    } else {
      // Also check if workspace has existing files or deployments
      const filesCount = await pool.query(
        `SELECT COUNT(*) as cnt FROM files WHERE project_id = $1`,
        [projectId],
      );
      if (Number(filesCount.rows[0]?.cnt || 0) > 0) {
        isDifferentRepo = true;
      }
    }
  }

  if (isDifferentRepo) {
    console.log(`[GitService] Different repository detected for project ${projectId}. Triggering full reset of files and Docker.`);
    const { resetProjectFilesAndDocker } = require("./project-cleanup.service");
    await resetProjectFilesAndDocker(projectId, ownerId);
  }

  let repositoryRecord = null;
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
          branch=$8,
          access_token=$9
      WHERE project_id=$1
      RETURNING *
      `,
      [
        projectId,
        "github",
        owner,
        repositoryName,
        parsed.normalizedUrl,
        cloneUrl,
        repo.default_branch,
        selectedBranch,
        token || null,
      ],
    );

    repositoryRecord = { ...result.rows[0], wasReset: isDifferentRepo };
  } else {
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
          branch,
          access_token
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        projectId,
        "github",
        owner,
        repositoryName,
        parsed.normalizedUrl,
        cloneUrl,
        repo.default_branch,
        selectedBranch,
        token || null,
      ],
    );

    repositoryRecord = { ...result.rows[0], wasReset: isDifferentRepo };
  }

  return repositoryRecord;
};

const disconnectRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const gitDirectory = getProjectGitDirectory(projectId);
  let gitSize = 0;
  try {
    gitSize = await filesystem.calculateDirectorySize(gitDirectory);
    await fs.rm(gitDirectory, {
      recursive: true,
      force: true,
    });
  } catch (err) {
    console.warn("Could not delete git directory:", err.message);
  }

  if (gitSize > 0) {
    await storageAllocation.releaseStorage(ownerId, gitSize).catch(() => {});
  }

  await pool.query(
    `
    UPDATE projects
    SET
        git_connected = FALSE,
        git_branch = NULL,
        git_remote_url = NULL,
        updated_at = NOW()
    WHERE id = $1
    `,
    [projectId],
  );

  await pool.query(
    `
        DELETE
        FROM project_repository
        WHERE project_id = $1
        `,
    [projectId],
  );
};

const getProjectGitDirectory = (projectId) => {
  return getGitRoot(projectId);
};

const cloneRepository = async (projectId, ownerId) => {
  const {
    syncGitToWorkspace,
    indexWorkspace,
    syncWorkspaceToGit,
  } = require("./workspace.sync.service");
  const { verifyProjectOwnership } = require("./project.service");

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
    throw notConnectedError();
  }

  const repository = result.rows[0];

  // Temporary Cloning for size check

  const tempDirectory = path.join(os.tmpdir(), "echoserver-clones", uuid());

  await fs.mkdir(tempDirectory, {
    recursive: true,
  });

  await github.cloneRepository(
    repository.clone_url,
    repository.branch,
    tempDirectory,
    repository.access_token,
  );

  let reserved = false;
  let cloneSize = 0;

  try {
    cloneSize = await filesystem.calculateDirectorySize(tempDirectory);

    // for try

    const gitDirectory = getProjectGitDirectory(projectId);

    await storageAllocation.checkQuota(ownerId, cloneSize);
    // IF size check is passed

    await fs.rm(gitDirectory, {
      recursive: true,
      force: true,
    });

    await fs.cp(tempDirectory, gitDirectory, {
      recursive: true,
    });

    await fs.rm(tempDirectory, {
      recursive: true,
      force: true,
    });

    if (repository.access_token) {
      await gitOperations.setAuthRemote(
        gitDirectory,
        repository.clone_url,
        repository.access_token,
      );
    }

    await storageAllocation.reserveStorage(ownerId, cloneSize);
    reserved = true;
    await checkGit(projectId, "after clone");

    await syncGitToWorkspace(projectId);
    await checkGit(projectId, "after syncGitToWorkspace");

    await indexWorkspace(projectId);
    await checkGit(projectId, "after indexWorkspace");

    await pool.query(
      `
  UPDATE projects
  SET
      git_connected = TRUE,
      git_branch = $2,
      git_remote_url = $3,
      updated_at = NOW()
  WHERE id = $1
  `,
      [projectId, repository.branch, repository.clone_url],
    );

    return {
      success: true,
    };
  } catch (error) {
    if (reserved) {
      await storageAllocation.releaseStorage(ownerId, cloneSize);
    }

    throw error;
  }
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
  const gitMetaDir = path.join(gitDirectory, ".git");

  const hasGit = await fs
    .access(gitMetaDir)
    .then(() => true)
    .catch(() => false);

  if (!hasGit) {
    return {
      branch: repository.branch || "main",
      ahead: 0,
      behind: 0,
      clean: true,
      changes: [],
      cloned: false,
      message: "Repository connected. Click 'Clone & Sync' to download repository files.",
    };
  }

  const status = await gitOperations.status(gitDirectory);

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
  if (!repository) {
    throw notConnectedError();
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  const result = await gitOperations.commit(gitDirectory, message);

  return result;
};

const pullRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");

  const {
    syncGitToWorkspace,
    indexWorkspace,
  } = require("./workspace.sync.service");

  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    throw notConnectedError();
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  if (repository.access_token) {
    await gitOperations.setAuthRemote(
      gitDirectory,
      repository.clone_url,
      repository.access_token,
    );
  }

  await gitOperations.pull(gitDirectory);

  await syncGitToWorkspace(projectId);

  await indexWorkspace(projectId);

  return {
    success: true,
  };
};

const pushRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");

  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    throw notConnectedError();
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  if (repository.access_token) {
    await gitOperations.setAuthRemote(
      gitDirectory,
      repository.clone_url,
      repository.access_token,
    );
  }

  await gitOperations.push(gitDirectory);

  return {
    success: true,
  };
};

const fetchRepository = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");

  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    throw notConnectedError();
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  if (repository.access_token) {
    await gitOperations.setAuthRemote(
      gitDirectory,
      repository.clone_url,
      repository.access_token,
    );
  }

  await gitOperations.fetch(gitDirectory);

  return {
    success: true,
  };
};

const updateRepository = async (projectId, ownerId) => {
  const {
    syncGitToWorkspace,
    indexWorkspace,
    syncWorkspaceToGit,
  } = require("./workspace.sync.service");
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);

  if (!repository) {
    throw notConnectedError();
  }

  const gitDirectory = getProjectGitDirectory(projectId);

  if (repository.access_token) {
    await gitOperations.setAuthRemote(
      gitDirectory,
      repository.clone_url,
      repository.access_token,
    );
  }

  await gitOperations.resetHard(gitDirectory, repository.branch);

  await syncGitToWorkspace(projectId);

  await indexWorkspace(projectId);

  return {
    success: true,
  };
};

const getCommits = async (projectId, ownerId, limit = 15) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    return [];
  }

  const gitDirectory = getProjectGitDirectory(projectId);
  const gitMetaDir = path.join(gitDirectory, ".git");
  const hasGit = await fs
    .access(gitMetaDir)
    .then(() => true)
    .catch(() => false);

  if (!hasGit) {
    return [];
  }

  return await gitOperations.log(gitDirectory, limit);
};

const getBranches = async (projectId, ownerId) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    return { current: "main", all: ["main"] };
  }

  const gitDirectory = getProjectGitDirectory(projectId);
  const gitMetaDir = path.join(gitDirectory, ".git");
  const hasGit = await fs
    .access(gitMetaDir)
    .then(() => true)
    .catch(() => false);

  if (!hasGit) {
    return {
      current: repository.branch || "main",
      all: [repository.branch || "main"],
    };
  }

  return await gitOperations.branches(gitDirectory);
};

const switchBranch = async (projectId, ownerId, branch) => {
  const { verifyProjectOwnership } = require("./project.service");
  const {
    syncGitToWorkspace,
    indexWorkspace,
  } = require("./workspace.sync.service");

  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    throw notConnectedError();
  }

  const gitDirectory = getProjectGitDirectory(projectId);
  await gitOperations.checkout(gitDirectory, branch);

  await pool.query(
    `
    UPDATE project_repository
    SET branch = $2
    WHERE project_id = $1
    `,
    [projectId, branch],
  );

  await pool.query(
    `
    UPDATE projects
    SET git_branch = $2, updated_at = NOW()
    WHERE id = $1
    `,
    [projectId, branch],
  );

  await syncGitToWorkspace(projectId);
  await indexWorkspace(projectId);

  return { success: true, branch };
};

const getDiff = async (projectId, ownerId, file = null) => {
  const { verifyProjectOwnership } = require("./project.service");
  await verifyProjectOwnership(projectId, ownerId);

  const repository = await getRepository(projectId, ownerId);
  if (!repository) {
    return "";
  }

  const gitDirectory = getProjectGitDirectory(projectId);
  const gitMetaDir = path.join(gitDirectory, ".git");
  const hasGit = await fs
    .access(gitMetaDir)
    .then(() => true)
    .catch(() => false);

  if (!hasGit) {
    return "";
  }

  return await gitOperations.diff(gitDirectory, file);
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
  pullRepository,
  pushRepository,
  fetchRepository,
  checkGit,
  getCommits,
  getBranches,
  switchBranch,
  getDiff,
};
