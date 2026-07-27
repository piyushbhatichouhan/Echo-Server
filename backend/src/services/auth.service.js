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
    password_hash,
    status,
    is_owner
  )
  VALUES ($1,$2,$3,'pending',FALSE)

  RETURNING
      id,
      username,
      email,
      status,
      created_at
`,
    [username, email, passwordHash],
  );
  return result.rows[0];
};

const { generateToken } = require("../utils/jwt");

const loginUser = async (loginData) => {
  const { email, password } = loginData;

  // Find the user
  const result = await pool.query(
    `
        SELECT
id,
username,
email,
disabled,
password_hash,
status,
is_owner
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

  if (user.status === "pending") {
    const error = new Error("Your account is awaiting approval.");

    error.status = 403;

    throw error;
  }

  if (user.status === "rejected") {
    const error = new Error("Your registration request was rejected.");

    error.status = 403;

    throw error;
  }

  if (user.disabled) {
    const error = new Error("Your account has been disabled.");

    error.status = 403;

    throw error;
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,

      username: user.username,

      email: user.email,

      isOwner: user.is_owner,
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
status,
is_owner,
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

  return {
    ...result.rows[0],
    isOwner: result.rows[0].is_owner,
  };
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
