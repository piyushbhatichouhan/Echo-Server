const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const routes = require("./routes");
const errorHandler = require("./middleware/error.middleware");
const app = express();
const runtimeMonitor = require("./services/runtime-monitor.service");

const { runUserDeletionJob } = require("./jobs/userDeletion.job");
const { requestLogger } = require("./services/serverLog.service");

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }),
);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        !process.env.NODE_ENV ||
        process.env.NODE_ENV === "development" ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".devpiyush.in")
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  }),
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(requestLogger);


// API Routes
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

runUserDeletionJob();

const deletionInterval =
  Number(process.env.USER_DELETION_JOB_INTERVAL_MS) || 300000;

setInterval(runUserDeletionJob, deletionInterval);

console.log(`[UserDeletion] Worker started (${deletionInterval} ms)`);

// Automated Docker Garbage Collection Worker
const { runDockerPruneJob } = require("./jobs/dockerPrune.job");
const pruneInterval =
  Number(process.env.DOCKER_PRUNE_INTERVAL_MS) || 6 * 60 * 60 * 1000;
setTimeout(runDockerPruneJob, 10000);
setInterval(runDockerPruneJob, pruneInterval);
console.log(`[DockerPrune] Worker scheduled (${pruneInterval} ms)`);

runtimeMonitor.start();

app.use(errorHandler);

module.exports = app;
