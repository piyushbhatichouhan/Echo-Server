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
    regex: /Mongo(Server|Network|Connection)?Error|MongooseServerSelectionError|Could not connect to any servers in your MongoDB Atlas cluster|ECONNREFUSED\s+(127\.0\.0\.1|localhost):27017/i,
    explain: () => ({
      title: "Database Connection Failed (MongoDB)",
      message: "Could not connect to MongoDB cluster or localhost:27017.",
      suggestion: "1) Whitelist this server's Outbound IP in MongoDB Atlas (Network Access → Add IP Address). 2) Ensure MONGODB_URI is configured in Environment Variables. 3) If your password has special characters (@, #, %), percent-encode them.",
    }),
  },
  {
    regex: /SequelizeConnectionError|PrismaClientInitializationError.*5432|no pg_hba\.conf entry|password authentication failed for user|ECONNREFUSED\s+(127\.0\.0\.1|localhost):5432|SSL connection is required/i,
    explain: () => ({
      title: "Database Connection Failed (PostgreSQL)",
      message: "Could not connect to PostgreSQL database.",
      suggestion: "1) Whitelist this server's Outbound IP in Supabase, Neon, or AWS RDS. 2) Append '?sslmode=require' to your DATABASE_URL. 3) For Supabase, use port 6543 (transaction pooler) to prevent connection limits. 4) Do not use localhost inside Docker.",
    }),
  },
  {
    regex: /ER_ACCESS_DENIED_ERROR|ER_HOST_NOT_PRIVILEGED|PROTOCOL_CONNECTION_LOST|ECONNREFUSED\s+(127\.0\.0\.1|localhost):3306/i,
    explain: () => ({
      title: "Database Connection Failed (MySQL / MariaDB)",
      message: "Could not connect to MySQL server.",
      suggestion: "1) Whitelist this server's Outbound IP on port 3306 in your cloud security groups. 2) Ensure the MySQL user has privileges granted for '%' or this server's IP, not just 'localhost'. 3) Enable SSL for cloud MySQL providers (PlanetScale, Aiven).",
    }),
  },
  {
    regex: /ECONNREFUSED\s+(127\.0\.0\.1|localhost):6379|NOAUTH\s+Authentication\s+required|WRONGPASS|MaxRetriesPerRequestError/i,
    explain: () => ({
      title: "Cache / Database Connection Failed (Redis)",
      message: "Could not connect or authenticate to Redis.",
      suggestion: "1) Inside Docker, 'localhost' is isolated. Set REDIS_URL to your cloud Redis (Upstash, Redis Cloud). 2) Cloud Redis requires TLS: use 'rediss://' (with double 's'). 3) Verify your password or token in Environment Variables.",
    }),
  },
  {
    regex: /FirebaseAppError|credential-error|Could not load the default credentials|Invalid PEM formatted message|Failed to parse private key/i,
    explain: () => ({
      title: "Firebase Admin Initialization Failed",
      message: "Could not load or parse Firebase service account credentials.",
      suggestion: "1) Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Environment Variables. 2) In Node.js, replace literal '\\n' characters: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n'). 3) Never commit serviceAccountKey.json to git.",
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

