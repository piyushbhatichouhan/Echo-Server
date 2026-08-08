const { getProjectFilesRoot } = require("../storage/project.storage.manager");
const { getProjectGitDirectory, copyDirectory } = require("./git.service");
const { pool } = require("../config/database");
const fs = require("fs/promises");
const path = require("path");

const normalizeRelativePath = (p) => p.split(path.sep).join("/");

const syncGitToWorkspace = async (projectId) => {
  const gitDirectory = getProjectGitDirectory(projectId);

  const workspaceDirectory = getProjectFilesRoot(projectId);

  // Remove old workspace completely
  await fs.rm(workspaceDirectory, {
    recursive: true,
    force: true,
  });

  // Recreate it
  await fs.mkdir(workspaceDirectory, {
    recursive: true,
  });

  // Copy everything except .git
  await copyDirectory(gitDirectory, workspaceDirectory);
};

const syncWorkspaceToGit = async (projectId) => {
  const workspaceDirectory = getProjectFilesRoot(projectId);

  const gitDirectory = getProjectGitDirectory(projectId);

  const syncDirectory = async (workspacePath, gitPath) => {
    const entries = await fs.readdir(workspacePath, {
      withFileTypes: true,
    });

    const gitEntries = await fs
      .readdir(gitPath, {
        withFileTypes: true,
      })
      .catch(() => []);

    await fs.mkdir(gitPath, {
      recursive: true,
    });

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }

      const workspaceEntry = path.join(workspacePath, entry.name);

      const gitEntry = path.join(gitPath, entry.name);

      if (entry.isDirectory()) {
        await syncDirectory(workspaceEntry, gitEntry);

        continue;
      }

      const data = await fs.readFile(workspaceEntry);

      await fs.writeFile(gitEntry, data);
    }

    for (const gitEntry of gitEntries) {
      if (gitEntry.name === ".git" || gitEntry.name === "node_modules") {
        continue;
      }
      const exists = entries.find((e) => e.name === gitEntry.name);

      if (exists) continue;

      const stalePath = path.join(gitPath, gitEntry.name);

      await fs.rm(stalePath, {
        recursive: true,
        force: true,
      });
    }
  };

  await syncDirectory(workspaceDirectory, gitDirectory);
};

const indexWorkspace = async (projectId) => {
  await pool.query(
    `
        DELETE FROM files
        WHERE project_id=$1
        `,
    [projectId],
  );

  const workspaceDirectory = getProjectFilesDirectory(projectId);

  const scanDirectory = async (absoluteDirectory, relativeDirectory = "") => {
    const entries = await fs.readdir(absoluteDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }

      const absolutePath = path.join(absoluteDirectory, entry.name);

      const relativePath = normalizeRelativePath(
        relativeDirectory
          ? path.join(relativeDirectory, entry.name)
          : entry.name,
      );

      if (entry.isDirectory()) {
        await pool.query(
          `
    INSERT INTO files
    (
        project_id,
        original_name,
        relative_path,
        stored_name,
        mime_type,
        file_size,
        storage_path,
        is_directory
    )
    VALUES
    ($1,$2,$3,NULL,NULL,0,$4,TRUE)
    `,
          [projectId, entry.name, relativePath, absolutePath],
        );

        await scanDirectory(absolutePath, relativePath);

        continue;
      }

      const stats = await fs.stat(absolutePath);

      await pool.query(
        `
  INSERT INTO files
  (
      project_id,
      original_name,
      relative_path,
      stored_name,
      mime_type,
      file_size,
      storage_path,
      is_directory
  )
  VALUES
  ($1,$2,$3,$4,$5,$6,$7,FALSE)
  `,
        [
          projectId,
          entry.name,
          relativePath,
          entry.name,
          null,
          stats.size,
          absolutePath,
        ],
      );
    }
  };
  await scanDirectory(workspaceDirectory);
};

module.exports = {
  syncGitToWorkspace,
  syncWorkspaceToGit,
  indexWorkspace,
};
