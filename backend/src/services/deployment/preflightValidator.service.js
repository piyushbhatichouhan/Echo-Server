const fs = require("fs/promises");
const path = require("path");
const workspace = require("../workspace/workspace.service");

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
  let pkgJson = null;
  if (settings.runtime === "node" || settings.runtime === "static") {
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

  // 5. Database Connection String & Localhost Detection
  const existingEnv = userEnvironment || [];
  const existingKeys = new Set(existingEnv.map((e) => e.key));
  const dbKeyRegex = /(MONGO|DATABASE_URL|POSTGRES|MYSQL|REDIS)/i;

  for (const envVar of existingEnv) {
    if (dbKeyRegex.test(envVar.key)) {
      const val = (envVar.value || "").trim().toLowerCase();
      if (val.includes("localhost") || val.includes("127.0.0.1")) {
        warnings.push(
          `⚠️ Notice: "${envVar.key}" points to localhost (${envVar.value}). Inside Docker, "localhost" refers to the container itself. Use a remote or cloud database URI (e.g. MongoDB Atlas, Supabase, Neon).`
        );
      }
    }
  }

  // 6. Proactive Database Driver Detection
  if (pkgJson) {
    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
    };

    if ((allDeps["mongoose"] || allDeps["mongodb"]) && !existingKeys.has("MONGODB_URI") && !existingKeys.has("MONGO_URI")) {
      warnings.push(
        "💡 Notice: MongoDB driver (mongoose/mongodb) detected in package.json. Ensure MONGODB_URI is set in Environment Variables."
      );
    }
    if ((allDeps["pg"] || allDeps["@prisma/client"]) && !existingKeys.has("DATABASE_URL") && !existingKeys.has("POSTGRES_URL")) {
      warnings.push(
        "💡 Notice: PostgreSQL driver (pg/prisma) detected in package.json. Ensure DATABASE_URL is set in Environment Variables."
      );
    }
    if (allDeps["mysql2"] && !existingKeys.has("DATABASE_URL") && !existingKeys.has("MYSQL_HOST")) {
      warnings.push(
        "💡 Notice: MySQL driver (mysql2) detected in package.json. Ensure DATABASE_URL or MySQL credentials are set in Environment Variables."
      );
    }
    if (allDeps["ioredis"] && !existingKeys.has("REDIS_URL")) {
      warnings.push(
        "💡 Notice: Redis client (ioredis) detected in package.json. Ensure REDIS_URL is set in Environment Variables."
      );
    }
    if (allDeps["firebase-admin"] && !existingKeys.has("FIREBASE_PROJECT_ID") && !existingKeys.has("FIREBASE_SERVICE_ACCOUNT")) {
      warnings.push(
        "💡 Notice: Firebase Admin SDK detected in package.json. Ensure FIREBASE_PROJECT_ID or credentials are set in Environment Variables."
      );
    }
  }

  return {
    valid: true,
    warnings,
  };
};

module.exports = {
  validatePreflight,
};

