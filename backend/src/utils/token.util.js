const crypto = require("crypto");

/**
 * Generates a secure random token.
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hashes a token before storing it in the database.
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports = {
  generateToken,
  hashToken,
};
