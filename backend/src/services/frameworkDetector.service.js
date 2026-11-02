const fs = require("fs/promises");
const path = require("path");
const workspace = require("./workspace/workspace.service");
const { verifyProjectOwnership } = require("./project.service");

/**
 * Auto-detects framework, runtime, and deployment settings by inspecting project files.
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

  const entries = await fs.readdir(projectDir).catch(() => []);
  const fileSet = new Set(entries.map((e) => e.toLowerCase()));

  // 1. Check for custom Dockerfile first
  if (fileSet.has("dockerfile")) {
    let dockerfileContent = "";
    try {
      dockerfileContent = await fs.readFile(path.join(projectDir, "Dockerfile"), "utf8");
    } catch {}

    return {
      detected: true,
      framework: "dockerfile",
      title: "Custom Dockerfile",
      runtime: "custom",
      working_directory: ".",
      install_command: "",
      build_command: "",
      start_command: "",
      output_directory: ".",
      port: 3000,
      dockerfile: dockerfileContent,
      confidence: 1.0,
      description: "Root Dockerfile detected. Will build using custom Docker specification.",
    };
  }

  // 2. Check for package.json (Node.js ecosystem)
  if (fileSet.has("package.json")) {
    try {
      const packageJsonRaw = await fs.readFile(path.join(projectDir, "package.json"), "utf8");
      const pkg = JSON.parse(packageJsonRaw);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      const scripts = pkg.scripts || {};

      // 2a. Next.js
      if (allDeps["next"]) {
        return {
          detected: true,
          framework: "nextjs",
          title: "Next.js",
          runtime: "node",
          working_directory: ".",
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx next build",
          start_command: scripts.start ? "npm start" : "npx next start",
          output_directory: ".next",
          port: 3000,
          confidence: 0.98,
          description: "Next.js SSR application detected.",
        };
      }

      // 2b. Vite (React / Vue / Svelte / Vanilla)
      if (allDeps["vite"] || fileSet.has("vite.config.js") || fileSet.has("vite.config.ts")) {
        return {
          detected: true,
          framework: "vite",
          title: "Vite (React / Vue / SPA)",
          runtime: "static",
          working_directory: ".",
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx vite build",
          start_command: "",
          output_directory: "dist",
          port: 80,
          confidence: 0.95,
          description: "Vite Single Page Application detected. Will build and serve with Nginx SPA fallback.",
        };
      }

      // 2c. Nuxt.js
      if (allDeps["nuxt"] || allDeps["nuxt3"]) {
        return {
          detected: true,
          framework: "nuxt",
          title: "Nuxt.js",
          runtime: "node",
          working_directory: ".",
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx nuxt build",
          start_command: "node .output/server/index.mjs",
          output_directory: ".output",
          port: 3000,
          confidence: 0.95,
          description: "Nuxt.js Vue framework detected.",
        };
      }

      // 2d. Astro
      if (allDeps["astro"]) {
        return {
          detected: true,
          framework: "astro",
          title: "Astro",
          runtime: "static",
          working_directory: ".",
          install_command: "npm install",
          build_command: scripts.build ? "npm run build" : "npx astro build",
          start_command: "",
          output_directory: "dist",
          port: 80,
          confidence: 0.95,
          description: "Astro static/content site detected.",
        };
      }

      // 2e. Create React App
      if (allDeps["react-scripts"]) {
        return {
          detected: true,
          framework: "cra",
          title: "Create React App",
          runtime: "static",
          working_directory: ".",
          install_command: "npm install",
          build_command: "npm run build",
          start_command: "",
          output_directory: "build",
          port: 80,
          confidence: 0.95,
          description: "Create React App static build detected.",
        };
      }

      // 2f. Express / Nest / Fastify / Generic Node Server
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
        title: isServer ? "Node.js Server (Express/Fastify)" : "Node.js Application",
        runtime: "node",
        working_directory: ".",
        install_command: "npm install",
        build_command: scripts.build ? "npm run build" : "",
        start_command: startCmd,
        output_directory: ".",
        port: 3000,
        confidence: 0.85,
        description: `Node.js project detected with main entry: ${startCmd}`,
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
        title: "Django Application",
        runtime: "python",
        working_directory: ".",
        install_command: "pip install -r requirements.txt",
        build_command: "python manage.py collectstatic --noinput",
        start_command: "python manage.py runserver 0.0.0.0:8000",
        output_directory: ".",
        port: 8000,
        confidence: 0.95,
        description: "Django web application detected via manage.py",
      };
    }

    // 3b. FastAPI
    let isFastAPI = false;
    if (fileSet.has("main.py")) {
      try {
        const mainContent = await fs.readFile(path.join(projectDir, "main.py"), "utf8");
        if (mainContent.includes("FastAPI")) isFastAPI = true;
      } catch {}
    }

    if (isFastAPI) {
      return {
        detected: true,
        framework: "fastapi",
        title: "FastAPI Application",
        runtime: "python",
        working_directory: ".",
        install_command: "pip install -r requirements.txt",
        build_command: "",
        start_command: "uvicorn main:app --host 0.0.0.0 --port 8000",
        output_directory: ".",
        port: 8000,
        confidence: 0.95,
        description: "FastAPI modern Python API detected.",
      };
    }

    // 3c. Flask or Generic Python
    let startPy = "python app.py";
    if (fileSet.has("main.py")) startPy = "python main.py";
    else if (fileSet.has("server.py")) startPy = "python server.py";

    return {
      detected: true,
      framework: "python-generic",
      title: "Python Application",
      runtime: "python",
      working_directory: ".",
      install_command: fileSet.has("requirements.txt") ? "pip install -r requirements.txt" : "",
      build_command: "",
      start_command: startPy,
      output_directory: ".",
      port: 8000,
      confidence: 0.85,
      description: `Python application detected. Starter: ${startPy}`,
    };
  }

  // 4. Pure Static HTML/CSS/JS
  if (fileSet.has("index.html")) {
    return {
      detected: true,
      framework: "static-html",
      title: "Static Website (HTML/CSS)",
      runtime: "static",
      working_directory: ".",
      install_command: "",
      build_command: "",
      start_command: "",
      output_directory: ".",
      port: 80,
      confidence: 0.9,
      description: "Static website detected via root index.html. No build step required.",
    };
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
