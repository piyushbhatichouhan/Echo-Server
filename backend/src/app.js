const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const errorHandler = require("./middleware/error.middleware");
const app = express();
const runtimeMonitor = require("./services/runtime-monitor.service");

const { runUserDeletionJob } = require("./jobs/userDeletion.job");
// Middleware
app.use(
  cors({
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(express.json());

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

runtimeMonitor.start();
app.use(errorHandler);

module.exports = app;
