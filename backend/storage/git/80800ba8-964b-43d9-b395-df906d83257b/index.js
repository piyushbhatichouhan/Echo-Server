// Load environment variables from a .env file

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Global Middleware ---
app.use(helmet()); // Sets security HTTP headers
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded payloads

// --- Sample Route ---
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Express API Boilerplate!",
  });
});

// --- 404 Route Handler ---
app.use((req, res, next) => {
  const error = new Error("Resource Not Found");
  error.status = 404;
  next(error);
});

// --- Centralized Error Handling Middleware ---
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || "Internal Server Error",
    },
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server successfully running on port ${PORT}`);
  console.log("hello echo");
});
