/**
 * Error Explainer Service
 * Analyzes deployment errors and log traces to provide actionable, human-friendly guidance.
 */

const EXPLAINERS = [
  {
    regex: /sh:\s*([a-zA-Z0-9_\-]+):\s*not found/i,
    explain: (match) => ({
      title: `Build Tool Missing: "${match[1]}"`,
      message: `The command failed because the executable '${match[1]}' was not found in the container's environment.`,
      suggestion: `Ensure '${match[1]}' is listed under 'dependencies' or 'devDependencies' in package.json, or prefix the command with 'npx' (e.g., 'npx ${match[1]} build').`,
    }),
  },
  {
    regex: /Missing script:\s*"([^"]+)"/i,
    explain: (match) => ({
      title: `Missing Script in package.json: "${match[1]}"`,
      message: `npm tried to execute "npm run ${match[1]}", but no "${match[1]}" script is defined in package.json.`,
      suggestion: `Check the "scripts" section in your package.json. If your build script has a different name (e.g., "build:prod"), update the Build Command in Project Settings.`,
    }),
  },
  {
    regex: /Cannot find module\s*['"]([^'"]+)['"]/i,
    explain: (match) => ({
      title: `Missing Module: "${match[1]}"`,
      message: `Node.js could not load the module '${match[1]}'. It may not be installed.`,
      suggestion: `Run 'npm install ${match[1]}' and commit your updated package.json and lockfile.`,
    }),
  },
  {
    regex: /ModuleNotFoundError:\s*No module named\s*['"]([^'"]+)['"]/i,
    explain: (match) => ({
      title: `Missing Python Package: "${match[1]}"`,
      message: `Python could not find the module '${match[1]}'.`,
      suggestion: `Add '${match[1]}' to your requirements.txt or pyproject.toml file.`,
    }),
  },
  {
    regex: /EADDRINUSE/i,
    explain: () => ({
      title: "Port Already in Use (EADDRINUSE)",
      message: "The application attempted to bind to a port that another process is already using.",
      suggestion: "Make sure your application reads process.env.PORT instead of hardcoding a fixed port number like 3000 or 5000.",
    }),
  },
  {
    regex: /Mongo(Server|Network|Connection)?Error|MongooseServerSelectionError|ECONNREFUSED\s+(127\.0\.0\.1|localhost):27017/i,
    explain: () => ({
      title: "Database Connection Failed (MongoDB)",
      message: "Could not connect to MongoDB at localhost / 127.0.0.1.",
      suggestion: "Inside Docker, 'localhost' refers to the container itself, not your host machine or cloud database. Set a MONGODB_URI environment variable pointing to your cloud database (e.g. MongoDB Atlas) in Project Settings → Environment Variables.",
    }),
  },
  {
    regex: /SequelizeConnectionError|ECONNREFUSED\s+(127\.0\.0\.1|localhost):5432/i,
    explain: () => ({
      title: "Database Connection Failed (PostgreSQL)",
      message: "Could not connect to PostgreSQL at localhost:5432.",
      suggestion: "Inside a container, 'localhost' is isolated. Set your DATABASE_URL environment variable to point to a managed cloud database.",
    }),
  },
  {
    regex: /JavaScript heap out of memory/i,
    explain: () => ({
      title: "JavaScript Heap Out of Memory",
      message: "Node.js ran out of memory while compiling your application.",
      suggestion: "The build exceeded memory limits. EchoServer has configured NODE_OPTIONS='--max-old-space-size=2048' automatically. Ensure there are no infinite recursion loops in your build plugins.",
    }),
  },
  {
    regex: /ERESOLVE.*conflicting peer dependency/i,
    explain: () => ({
      title: "NPM Peer Dependency Conflict",
      message: "NPM detected incompatible version requirements between your installed packages.",
      suggestion: "Set install command to 'npm install --legacy-peer-deps' in Project Settings → Build & Deployment to bypass strict peer dependency checks.",
    }),
  },
  {
    regex: /index\.html was not found in the output directory/i,
    explain: () => ({
      title: "Static Build Output Missing index.html",
      message: "The static build succeeded, but index.html was not generated in the specified Output Directory.",
      suggestion: "Check your framework's build output. If Vite outputs to 'dist' but settings specify 'build', change Output Directory to 'dist' in Project Settings.",
    }),
  },
  {
    regex: /can't cd to ([^:\n]+)/i,
    explain: (match) => ({
      title: `Subdirectory Not Found: "${match[1].trim()}"`,
      message: `A command attempted to change directory to '${match[1].trim()}', but it does not exist.`,
      suggestion: "Verify your folder structure in the File Browser. If your backend is in the root directory rather than a 'backend/' folder, remove 'cd backend' from your scripts.",
    }),
  },
  {
    regex: /did not respond to HTTP probe on port (\d+)/i,
    explain: (match) => ({
      title: `Application Not Responding on Port ${match[1]}`,
      message: `The container started, but nothing answered HTTP probes on port ${match[1]} within the health timeout.`,
      suggestion: `Ensure your application server listens on host '0.0.0.0' (not '127.0.0.1') and port process.env.PORT (or ${match[1]}). Check your application startup logs for any unhandled exceptions.`,
    }),
  },
];

/**
 * Parses error objects or raw text logs and returns an actionable explanation
 */
function explainError(errorOrLog) {
  const text = typeof errorOrLog === "string" ? errorOrLog : errorOrLog?.message || "";
  if (!text) return null;

  for (const item of EXPLAINERS) {
    const match = text.match(item.regex);
    if (match) {
      return item.explain(match);
    }
  }

  return null;
}

module.exports = {
  explainError,
};

