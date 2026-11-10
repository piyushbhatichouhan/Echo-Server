const fs = require("fs/promises");
const path = require("path");
const workspace = require("../workspace.service");

/**
 * Pre-Flight Validator Service
 * Validates configuration, files, and scripts before executing heavy Docker builds.
 */
const validatePreflight = async (projectId, settings, userEnvironment = []) => {
  const rootPath = workspace.getProjectFilesDirectory(projectId);
  const warnings = [];

  // 1. Verify Root Workspace Exists
  try {
    await fs.access(rootPath);
  } catch {
    const err = new Error("Project workspace is empty or has not been initialized yet.");
    err.status = 400;
    err.isUserError = true;
    throw err;
  }

  // 2. Verify Working Directory Exists
  const workingDirRel = settings.working_directory && settings.working_directory !== "."
    ? settings.working_directory.replace(/^\/+/, "")
    : "";
  const workingDirPath = workingDirRel ? path.join(rootPath, workingDirRel) : rootPath;

  try {
    await fs.access(workingDirPath);
  } catch {
    const err = new Error(
      `Working directory "${settings.working_directory}" does not exist in the repository. Please verify your folder names in the File Browser.`
    );
    err.status = 400;
    err.isUserError = true;
    throw err;
  }

  // 3. Node.js & Static Script Validation
  if (settings.runtime === "node" || settings.runtime === "static") {
    let pkgJson = null;
    try {
      const pkgRaw = await fs.readFile(path.join(workingDirPath, "package.json"), "utf8");
      pkgJson = JSON.parse(pkgRaw);
    } catch {
      try {
        const rootPkgRaw = await fs.readFile(path.join(rootPath, "package.json"), "utf8");
        pkgJson = JSON.parse(rootPkgRaw);
      } catch {}
    }

    if (pkgJson && pkgJson.scripts) {
      // Validate build_command script
      const buildMatch = (settings.build_command || "").trim().match(/npm\s+run\s+([a-zA-Z0-9_\-:]+)/);
      if (buildMatch) {
        const scriptName = buildMatch[1];
        if (!pkgJson.scripts[scriptName]) {
          const available = Object.keys(pkgJson.scripts);
          const err = new Error(
            `Build Command specifies "npm run ${scriptName}", but "${scriptName}" is not defined in package.json scripts. Available scripts: ${available.join(", ") || "none"}`
          );
          err.status = 400;
          err.isUserError = true;
          throw err;
        }
      }

      // Validate start_command script (Node only)
      if (settings.runtime === "node") {
        const startMatch = (settings.start_command || "").trim().match(/npm\s+run\s+([a-zA-Z0-9_\-:]+)/);
        if (startMatch) {
          const scriptName = startMatch[1];
          if (!pkgJson.scripts[scriptName]) {
            const available = Object.keys(pkgJson.scripts);
            const err = new Error(
              `Start Command specifies "npm run ${scriptName}", but "${scriptName}" is not defined in package.json scripts. Available scripts: ${available.join(", ") || "none"}`
            );
            err.status = 400;
            err.isUserError = true;
            throw err;
          }
        }
      }
    }
  }

  // 4. Missing Environment Variables Check (.env.example)
  try {
    const candidates = [
      path.join(rootPath, ".env.example"),
      path.join(workingDirPath, ".env.example"),
      path.join(rootPath, "backend", ".env.example"),
    ];

    for (const cand of candidates) {
      try {
        const content = await fs.readFile(cand, "utf8");
        const lines = content.split("\n");
        const exampleKeys = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const key = trimmed.split("=")[0].trim();
            if (key) exampleKeys.push(key);
          }
        }

        const existingKeys = new Set((userEnvironment || []).map((e) => e.key));
        const missing = exampleKeys.filter((k) => !existingKeys.has(k) && k !== "PORT" && k !== "HOST");
        if (missing.length > 0) {
          warnings.push(
            `💡 Notice: Found variables in .env.example not configured in Environment Variables: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ""}`
          );
        }
        break;
      } catch {}
    }
  } catch {}

  return {
    valid: true,
    warnings,
  };
};

module.exports = {
  validatePreflight,
};

