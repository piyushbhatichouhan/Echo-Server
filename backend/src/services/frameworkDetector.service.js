const fs = require("fs/promises");
const path = require("path");
const workspace = require("./workspace/workspace.service");
const projectService = require("./project.service");
const verifyProjectOwnership = (projectId, ownerId) =>
  projectService.verifyProjectOwnership(projectId, ownerId);

/**
 * Inspects a specific directory for framework indicators.
 */
const inspectDirectory = async (targetDir, workingDir = ".") => {
  const entries = await fs.readdir(targetDir).catch(() => []);
  const fileSet = new Set(entries.map((e) => e.toLowerCase()));

  // 1. Check for custom Dockerfile
  if (fileSet.has("dockerfile")) {
    let dockerfileContent = "";
    try {
      dockerfileContent = await fs.readFile(path.join(targetDir, "Dockerfile"), "utf8");
    } catch {}

    return {
      detected: true,
      framework: "dockerfile",
      title: workingDir === "." ? "Custom Dockerfile" : `Custom Dockerfile (${workingDir})`,
      runtime: "custom",
      working_directory: workingDir,
      install_command: "",
      build_command: "",
      start_command: "",
      output_directory: ".",
      port: 3000,
      dockerfile: dockerfileContent,
      confidence: 1.0,
      description: `Dockerfile detected in ${workingDir === "." ? "root" : workingDir}. Will build using custom Docker specification.`,
    };
  }

  // 2. Check for package.json (Node.js ecosystem)
  if (fileSet.has("package.json")) {
    try {
      const packageJsonRaw = await fs.readFile(path.join(targetDir, "package.json"), "utf8");
      const pkg = JSON.parse(packageJsonRaw);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      const scripts = pkg.scripts || {};

      // 2a. Full-Stack / Monorepo Check (Root package.json with subfolder scripts like TaskPulse MERN)
      const isMonorepo =
        Boolean(pkg.workspaces) ||
        Boolean(scripts["install:all"]) ||
        Boolean(scripts["install:backend"]) ||
        Boolean(scripts["install:frontend"]) ||
        Boolean(scripts["dev:server"]) ||
        Boolean(scripts["dev:client"]) ||
        ((fileSet.has("backend") || fileSet.has("server")) &&
          (fileSet.has("frontend") || fileSet.has("client")));

      if (isMonorepo && workingDir === ".") {
        const hasStartScript = Boolean(scripts.start);
        const hasBuildScript = Boolean(scripts.build);
        const hasInstallAll = Boolean(scripts["install:all"]);

        let startCmd = "npm start";
        if (!hasStartScript) {
          if (fileSet.has("backend")) startCmd = "node backend/server.js";
          else if (fileSet.has("server")) startCmd = "node server/index.js";
          else startCmd = "node server.js";
        }

        return {
          detected: true,
          framework: "mern-monorepo",
          title: "Full-Stack Monorepo (Node.js + React/Vite/MERN)",
          runtime: "node",
          working_directory: ".",
          install_command: hasInstallAll ? "npm run install:all" : "npm install",
          build_command: hasBuildScript ? "npm run build" : "",
          start_command: startCmd,
          output_directory: ".",
          port: 3000,
          confidence: 0.99,
          description:
            "Full-Stack Node.js (MERN/Full-Stack) application with frontend and backend services detected in monorepo structure.",
        };
      }

      // 2b. Next.js
      if (allDeps["next"]) {
        return {
          detected: true,
          framework: "nextjs",
          title: workingDir === "." ? "Next.js" : `Next.js (${workingDir})`,
          runtime: "node",
          working_directory: workingDir,
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx next build",
          start_command: scripts.start ? "npm start" : "npx next start",
          output_directory: ".next",
          port: 3000,
          confidence: 0.98,
          description: `Next.js SSR application detected in ${workingDir === "." ? "root" : workingDir}.`,
        };
      }

      // 2c. Vite (React / Vue / Svelte / Vanilla)
      if (allDeps["vite"] || fileSet.has("vite.config.js") || fileSet.has("vite.config.ts")) {
        return {
          detected: true,
          framework: "vite",
          title: workingDir === "." ? "Vite (React / Vue / SPA)" : `Vite (${workingDir})`,
          runtime: "static",
          working_directory: workingDir,
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx vite build",
          start_command: "",
          output_directory: "dist",
          port: 80,
          confidence: 0.95,
          description: `Vite Single Page Application detected in ${workingDir === "." ? "root" : workingDir}. Will build and serve with Nginx SPA fallback.`,
        };
      }

      // 2d. Nuxt.js
      if (allDeps["nuxt"] || allDeps["nuxt3"]) {
        return {
          detected: true,
          framework: "nuxt",
          title: workingDir === "." ? "Nuxt.js" : `Nuxt.js (${workingDir})`,
          runtime: "node",
          working_directory: workingDir,
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx nuxt build",
          start_command: "node .output/server/index.mjs",
          output_directory: ".output",
          port: 3000,
          confidence: 0.95,
          description: `Nuxt.js Vue framework detected in ${workingDir === "." ? "root" : workingDir}.`,
        };
      }

      // 2e. Astro
      if (allDeps["astro"]) {
        return {
          detected: true,
          framework: "astro",
          title: workingDir === "." ? "Astro" : `Astro (${workingDir})`,
          runtime: "static",
          working_directory: workingDir,
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx astro build",
          start_command: "",
          output_directory: "dist",
          port: 80,
          confidence: 0.95,
          description: `Astro static site detected in ${workingDir === "." ? "root" : workingDir}.`,
        };
      }

      // 2f. Create React App
      if (allDeps["react-scripts"]) {
        return {
          detected: true,
          framework: "cra",
          title: workingDir === "." ? "Create React App" : `Create React App (${workingDir})`,
          runtime: "static",
          working_directory: workingDir,
          install_command: "npm install",
          build_command: "npm run build",
          start_command: "",
          output_directory: "build",
          port: 80,
          confidence: 0.95,
          description: `Create React App static build detected in ${workingDir === "." ? "root" : workingDir}.`,
        };
      }

      // 2g. Express / Nest / Fastify / Generic Node Server
      const isServer =
        allDeps["express"] ||
        allDeps["fastify"] ||
        allDeps["@nestjs/core"] ||
        allDeps["koa"] ||
        fileSet.has("server.js") ||
        fileSet.has("app.js") ||
        fileSet.has("index.js");

      let startCmd = "npm start";
      if (!scripts.start) {
        if (fileSet.has("server.js")) startCmd = "node server.js";
        else if (fileSet.has("app.js")) startCmd = "node app.js";
        else if (fileSet.has("index.js")) startCmd = "node index.js";
      }

      return {
        detected: true,
        framework: isServer ? "node-server" : "node-generic",
        title: isServer
          ? workingDir === "."
            ? "Node.js Server (Express/Fastify)"
            : `Node.js Server (${workingDir})`
          : workingDir === "."
            ? "Node.js Application"
            : `Node.js Application (${workingDir})`,
        runtime: "node",
        working_directory: workingDir,
        install_command: "npm install",
        build_command: scripts.build ? "npm run build" : "",
        start_command: startCmd,
        output_directory: ".",
        port: 3000,
        confidence: isServer ? 0.92 : 0.85,
        description: `Node.js project detected in ${workingDir === "." ? "root" : workingDir} with main entry: ${startCmd}`,
      };
    } catch (e) {
      console.warn("Failed to parse package.json for auto-detection:", e.message);
    }
  }

  // 3. Check for Python ecosystem
  if (
    fileSet.has("requirements.txt") ||
    fileSet.has("pyproject.toml") ||
    fileSet.has("pipfile") ||
    fileSet.has("manage.py") ||
    fileSet.has("app.py") ||
    fileSet.has("main.py")
  ) {
    // 3a. Django
    if (fileSet.has("manage.py")) {
      return {
        detected: true,
        framework: "django",
        title: workingDir === "." ? "Django Application" : `Django (${workingDir})`,
        runtime: "python",
        working_directory: workingDir,
        install_command: "pip install -r requirements.txt",
        build_command: "python manage.py collectstatic --noinput",
        start_command: "python manage.py runserver 0.0.0.0:8000",
        output_directory: ".",
        port: 8000,
        confidence: 0.95,
        description: `Django web application detected via manage.py in ${workingDir === "." ? "root" : workingDir}.`,
      };
    }

    // 3b. FastAPI
    let isFastAPI = false;
    if (fileSet.has("main.py")) {
      try {
        const mainContent = await fs.readFile(path.join(targetDir, "main.py"), "utf8");
        if (mainContent.includes("FastAPI")) isFastAPI = true;
      } catch {}
    }

    if (isFastAPI) {
      return {
        detected: true,
        framework: "fastapi",
        title: workingDir === "." ? "FastAPI Application" : `FastAPI (${workingDir})`,
        runtime: "python",
        working_directory: workingDir,
        install_command: "pip install -r requirements.txt",
        build_command: "",
        start_command: "uvicorn main:app --host 0.0.0.0 --port 8000",
        output_directory: ".",
        port: 8000,
        confidence: 0.95,
        description: `FastAPI modern Python API detected in ${workingDir === "." ? "root" : workingDir}.`,
      };
    }

    // 3c. Flask or Generic Python
    let startPy = "python app.py";
    if (fileSet.has("main.py")) startPy = "python main.py";
    else if (fileSet.has("server.py")) startPy = "python server.py";

    return {
      detected: true,
      framework: "python-generic",
      title: workingDir === "." ? "Python Application" : `Python (${workingDir})`,
      runtime: "python",
      working_directory: workingDir,
      install_command: fileSet.has("requirements.txt") ? "pip install -r requirements.txt" : "",
      build_command: "",
      start_command: startPy,
      output_directory: ".",
      port: 8000,
      confidence: 0.85,
      description: `Python application detected in ${workingDir === "." ? "root" : workingDir}. Starter: ${startPy}`,
    };
  }

  // 4. Go Application (Smart Buildpack)
  if (fileSet.has("go.mod") || fileSet.has("main.go")) {
    return {
      detected: true,
      framework: "go",
      title: workingDir === "." ? "Go Application (Buildpack)" : `Go (${workingDir})`,
      runtime: "buildpack",
      working_directory: workingDir,
      install_command: "go mod download",
      build_command: "go build -o server .",
      start_command: "./server",
      output_directory: ".",
      port: 8080,
      confidence: 0.95,
      description: `Go application detected via ${fileSet.has("go.mod") ? "go.mod" : "main.go"} in ${workingDir === "." ? "root" : workingDir}. Universal Buildpack enabled.`,
    };
  }

  // 5. Rust Application (Smart Buildpack)
  if (fileSet.has("cargo.toml")) {
    return {
      detected: true,
      framework: "rust",
      title: workingDir === "." ? "Rust Application (Buildpack)" : `Rust (${workingDir})`,
      runtime: "buildpack",
      working_directory: workingDir,
      install_command: "",
      build_command: "cargo build --release",
      start_command: "./target/release/app",
      output_directory: ".",
      port: 8080,
      confidence: 0.95,
      description: `Rust project detected via Cargo.toml in ${workingDir === "." ? "root" : workingDir}. Universal Buildpack enabled.`,
    };
  }

  // 6. Bun Application (Smart Buildpack)
  if (fileSet.has("bun.lockb") || fileSet.has("bun.lock")) {
    return {
      detected: true,
      framework: "bun",
      title: workingDir === "." ? "Bun Application (Buildpack)" : `Bun (${workingDir})`,
      runtime: "buildpack",
      working_directory: workingDir,
      install_command: "bun install",
      build_command: "",
      start_command: "bun run start",
      output_directory: ".",
      port: 3000,
      confidence: 0.95,
      description: `Bun runtime project detected in ${workingDir === "." ? "root" : workingDir}. Universal Buildpack enabled.`,
    };
  }

  // 7. Java Application (Maven / Gradle Buildpack)
  if (fileSet.has("pom.xml") || fileSet.has("build.gradle")) {
    const isMaven = fileSet.has("pom.xml");
    return {
      detected: true,
      framework: isMaven ? "java-maven" : "java-gradle",
      title: workingDir === "." ? `Java (${isMaven ? "Maven" : "Gradle"})` : `Java ${workingDir}`,
      runtime: "buildpack",
      working_directory: workingDir,
      install_command: "",
      build_command: isMaven ? "mvn clean package -DskipTests" : "gradle build -x test",
      start_command: "java -jar target/*.jar",
      output_directory: ".",
      port: 8080,
      confidence: 0.95,
      description: `Java application detected via ${isMaven ? "pom.xml" : "build.gradle"} in ${workingDir === "." ? "root" : workingDir}. Universal Buildpack enabled.`,
    };
  }

  // 8. PHP Application (Smart Buildpack)
  if (fileSet.has("composer.json") || fileSet.has("index.php")) {
    return {
      detected: true,
      framework: "php",
      title: workingDir === "." ? "PHP Application (Buildpack)" : `PHP (${workingDir})`,
      runtime: "buildpack",
      working_directory: workingDir,
      install_command: fileSet.has("composer.json") ? "composer install" : "",
      build_command: "",
      start_command: "apache2-foreground",
      output_directory: ".",
      port: 80,
      confidence: 0.92,
      description: `PHP web application detected in ${workingDir === "." ? "root" : workingDir}. Universal Buildpack enabled.`,
    };
  }

  // 9. Ruby Application (Smart Buildpack)
  if (fileSet.has("gemfile")) {
    return {
      detected: true,
      framework: "ruby",
      title: workingDir === "." ? "Ruby Application (Buildpack)" : `Ruby (${workingDir})`,
      runtime: "buildpack",
      working_directory: workingDir,
      install_command: "bundle install",
      build_command: "",
      start_command: "bundle exec rackup --host 0.0.0.0 -p 3000",
      output_directory: ".",
      port: 3000,
      confidence: 0.92,
      description: `Ruby application detected via Gemfile in ${workingDir === "." ? "root" : workingDir}. Universal Buildpack enabled.`,
    };
  }

  // 10. Pure Static HTML/CSS/JS
  if (fileSet.has("index.html")) {
    return {
      detected: true,
      framework: "static-html",
      title: workingDir === "." ? "Static Website (HTML/CSS)" : `Static Site (${workingDir})`,
      runtime: "static",
      working_directory: workingDir,
      install_command: "",
      build_command: "",
      start_command: "",
      output_directory: ".",
      port: 80,
      confidence: 0.9,
      description: `Static website detected via index.html in ${workingDir === "." ? "root" : workingDir}. No build step required.`,
    };
  }

  return null;
};

/**
 * Auto-detects framework, runtime, and deployment settings by inspecting project files,
 * including root files and subdirectories (e.g. backend, frontend, server, client).
 */
const detectFramework = async (projectId, ownerId) => {
  if (ownerId) {
    await verifyProjectOwnership(projectId, ownerId);
  }

  const projectDir = workspace.getProjectFilesDirectory(projectId);

  // Check if directory exists
  try {
    await fs.access(projectDir);
  } catch {
    return {
      detected: false,
      message: "Workspace directory not found",
    };
  }

  // 1. First inspect root directory
  const rootResult = await inspectDirectory(projectDir, ".");
  if (rootResult && rootResult.framework !== "node-generic") {
    return rootResult;
  }

  // 2. Discover subdirectories (up to 1 level deep)
  const entries = await fs.readdir(projectDir).catch(() => []);
  const subdirs = [];
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "node_modules" || entry === "dist" || entry === "build") {
      continue;
    }
    try {
      const st = await fs.stat(path.join(projectDir, entry));
      if (st.isDirectory()) {
        subdirs.push(entry);
      }
    } catch {}
  }

  const lowerSubdirs = subdirs.map((s) => s.toLowerCase());

  // 2a. Check if separate backend and frontend directories exist
  const hasBackend =
    lowerSubdirs.includes("backend") ||
    lowerSubdirs.includes("server") ||
    lowerSubdirs.includes("api");
  const hasFrontend =
    lowerSubdirs.includes("frontend") ||
    lowerSubdirs.includes("client") ||
    lowerSubdirs.includes("web") ||
    lowerSubdirs.includes("ui");

  if (hasBackend && hasFrontend) {
    const backendFolder = subdirs.find((s) => ["backend", "server", "api"].includes(s.toLowerCase())) || "backend";
    const frontendFolder = subdirs.find((s) => ["frontend", "client", "web", "ui"].includes(s.toLowerCase())) || "frontend";

    // Check if backend is node or python
    const backendFiles = await fs.readdir(path.join(projectDir, backendFolder)).catch(() => []);
    const isBackendPython = backendFiles.some((f) => f.toLowerCase() === "requirements.txt" || f.toLowerCase() === "main.py");

    return {
      detected: true,
      framework: "mern-monorepo",
      title: "Full-Stack Application (Frontend + Backend)",
      runtime: isBackendPython ? "python" : "node",
      working_directory: ".",
      install_command: isBackendPython
        ? `pip install -r ${backendFolder}/requirements.txt && (cd ${frontendFolder} && npm install)`
        : `(cd ${backendFolder} && npm install) && (cd ${frontendFolder} && npm install)`,
      build_command: `cd ${frontendFolder} && npm run build`,
      start_command: isBackendPython
        ? `python ${backendFolder}/app.py`
        : `node ${backendFolder}/server.js`,
      output_directory: ".",
      port: isBackendPython ? 8000 : 3000,
      confidence: 0.96,
      description: `Full-stack application detected with separate ${backendFolder}/ and ${frontendFolder}/ directories.`,
    };
  }

  // 2b. Check each individual subdirectory for a recognizable project
  for (const subdir of subdirs) {
    const subPath = path.join(projectDir, subdir);
    const subResult = await inspectDirectory(subPath, subdir);
    if (subResult) {
      return subResult;
    }
  }

  // 3. Fallback to rootResult if it had node-generic, or return generic fallback
  if (rootResult) {
    return rootResult;
  }

  return {
    detected: false,
    message: "No specific framework recognized. Using default custom settings.",
    runtime: "custom",
    working_directory: ".",
    install_command: "",
    build_command: "",
    start_command: "",
    output_directory: ".",
  };
};

module.exports = {
  detectFramework,
};
