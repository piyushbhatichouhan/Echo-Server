const { pool } = require("../config/database");
const bcrypt = require("bcrypt");

const registerUser = async (userData) => {
  const { username, email, password } = userData;

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE username = $1",
    [username],
  );

  if (existingUser.rows.length > 0) {
    const error = new Error("Username already exists");
    error.status = 409;
    throw error;
  }

  const existingEmail = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email],
  );

  if (existingEmail.rows.length > 0) {
    const error = new Error("Email already exists");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
  INSERT INTO users (
    username,
    email,
    password_hash
  )
  VALUES ($1, $2, $3)
  RETURNING id, username, email, created_at
  `,
    [username, email, passwordHash],
  );

  return result.rows[0];
};

const { generateToken } = require("../utils/jwt");
const { login } = require("../controllers/auth.controller");

const loginUser = async (loginData) => {
  const { email, password } = loginData;

  // Find the user
  const result = await pool.query(
    `
        SELECT
            id,
            username,
            email,
            password_hash
        FROM users
        WHERE email = $1
        `,
    [email],
  );

  if (result.rows.length === 0) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const user = result.rows[0];

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
};

const getCurrentUser = async (userId) => {
  const result = await pool.query(
    `
        SELECT
            id,
            username,
            email,
            created_at
        FROM users
        WHERE id = $1
        `,
    [userId],
  );

  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
