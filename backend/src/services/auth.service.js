const { pool } = require("../config/database");
const bcrypt = require("bcrypt");
const storageAllocation = require("./storageAllocation.service");
const { generateToken, hashToken } = require("../utils/token.util");
const { sendVerificationEmail } = require("./mail.service");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("./mail.service");
const { generateToken1 } = require("../utils/jwt");
const adminService = require("./admin.service");

const registerUser = async (userData) => {
  const defaultQuota = await storageAllocation.getDefaultQuota();

  const assignedQuota = await storageAllocation.allocateQuota(defaultQuota);

  const { username, password } = userData;
  const email = userData.email.trim().toLowerCase();

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

  const verificationToken = generateToken();
  const verificationTokenHash = hashToken(verificationToken);

  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
INSERT INTO users (
    username,
    email,
    password_hash,
    status,
    verified,
    verification_token_hash,
    verification_token_expires,
    is_owner,
    quota_bytes,
    used_bytes
)
 VALUES (
    $1,
    $2,
    $3,
    'pending',
    FALSE,
    $4,
    $5,
    FALSE,
    $6,
    0
)

  RETURNING
      id,
      username,
      email,
      status,
      quota_bytes,
      used_bytes,
      created_at
`,
    [
      username,
      email,
      passwordHash,
      verificationTokenHash,
      verificationTokenExpires,
      assignedQuota,
    ],
  );

  await sendVerificationEmail({
    email,
    username,
    token: verificationToken,
  });
  return result.rows[0];
};

const verifyEmail = async (token) => {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `
    SELECT id
    FROM users
    WHERE
      verification_token_hash = $1
      AND verification_token_expires > NOW()
    `,
    [tokenHash],
  );

  if (result.rows.length === 0) {
    const error = new Error("Verification link is invalid or expired.");
    error.status = 400;
    throw error;
  }

  await pool.query(
    `
    UPDATE users
    SET
      verified = TRUE,
      verification_token_hash = NULL,
      verification_token_expires = NULL
    WHERE id = $1
    `,
    [result.rows[0].id],
  );

  return {
    success: true,
  };
};

const resendVerificationEmail = async (email) => {
  email = email.trim().toLowerCase();

  const result = await pool.query(
    `
    SELECT
      id,
      username,
      email,
      verified
    FROM users
    WHERE email = $1
    `,
    [email],
  );

  if (result.rows.length === 0) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  const user = result.rows[0];

  if (user.verified) {
    const error = new Error("Email is already verified.");
    error.status = 400;
    throw error;
  }

  const verificationToken = generateToken();
  const verificationTokenHash = hashToken(verificationToken);

  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    `
    UPDATE users
    SET
      verification_token_hash = $1,
      verification_token_expires = $2
    WHERE id = $3
    `,
    [verificationTokenHash, verificationTokenExpires, user.id],
  );

  await sendVerificationEmail({
    email: user.email,
    username: user.username,
    token: verificationToken,
  });

  return {
    success: true,
  };
};

const loginUser = async (loginData) => {
  const { password } = loginData;
  const email = loginData.email.trim().toLowerCase();

  // Find the user
  const result = await pool.query(
    `
SELECT
id,
username,
email,
verified,
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

  if (!user.verified) {
    const error = new Error("Please verify your email before logging in.");

    error.status = 403;

    error.code = "EMAIL_NOT_VERIFIED";

    error.email = user.email;

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

  const token = generateToken1(user);

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

const forgotPasswordUser = async (email) => {
  email = email.trim().toLowerCase();

  const result = await pool.query(
    `
    SELECT id,email,verified
    FROM users
    WHERE email=$1
`,
    [email],
  );

  if (result.rows.length === 0) {
    return;
  }

  const user = result.rows[0];

  if (!user.verified) {
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const expires = new Date(Date.now() + 30 * 60 * 1000);

  await pool.query(
    `
UPDATE users
SET
password_reset_token_hash=$1,
password_reset_token_expires=$2
WHERE id=$3
`,
    [tokenHash, expires, user.id],
  );

  await sendPasswordResetEmail(user.email, token);
};

const resetPasswordUser = async (token, password) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const result = await pool.query(
    `
SELECT id,password_reset_token_expires
FROM users
WHERE password_reset_token_hash=$1
`,
    [tokenHash],
  );

  if (result.rows.length === 0) {
    const error = new Error("Invalid reset link.");
    error.status = 400;
    throw error;
  }

  const user = result.rows[0];

  if (new Date(user.password_reset_token_expires) < new Date()) {
    const error = new Error("Reset link expired.");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `
UPDATE users
SET
password_hash=$1,
password_reset_token_hash=NULL,
password_reset_token_expires=NULL
WHERE id=$2
`,
    [passwordHash, user.id],
  );
};

const validateResetPasswordToken = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const result = await pool.query(
    `
SELECT
password_reset_token_expires
FROM users
WHERE password_reset_token_hash=$1
`,
    [tokenHash],
  );

  if (result.rows.length === 0) {
    const err = new Error("Invalid reset link.");
    err.status = 400;
    throw err;
  }

  if (new Date(result.rows[0].password_reset_token_expires) < new Date()) {
    const err = new Error("Reset link expired.");
    err.status = 400;
    throw err;
  }

  return true;
};

const deleteOwnAccount = async (userId) => {
  return adminService.deleteUser(userId);
};

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  getCurrentUser,
  resendVerificationEmail,
  forgotPasswordUser,
  resetPasswordUser,
  validateResetPasswordToken,
  deleteOwnAccount,
};
