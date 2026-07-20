const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const errorHandler = require("./middleware/error.middleware");
const app = express();
const runtimeMonitor = require("./services/runtime-monitor.service");
// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

runtimeMonitor.start();
app.use(errorHandler);
module.exports = app;
