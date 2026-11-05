const nodemailer = require("nodemailer");

/**
 * Returns a normalized "From" address string.
 * Priority: process.env.MAIL_FROM -> "EchoHub" <process.env.MAIL_USER> -> fallback
 */
const getFromAddress = () => {
  const mailFrom = process.env.MAIL_FROM?.trim();
  if (mailFrom) {
    if (mailFrom.includes("<") && mailFrom.includes(">")) {
      return mailFrom;
    }
    if (mailFrom.includes("@")) {
      return `"EchoHub" <${mailFrom}>`;
    }
    return mailFrom;
  }
  const user = process.env.MAIL_USER?.trim();
  return user ? `"EchoHub" <${user}>` : '"EchoHub" <noreply@localhost>';
};

/**
 * Creates and configures the Nodemailer SMTP transporter.
 */
const createTransporter = () => {
  const port = Number(process.env.MAIL_PORT) || 587;
  // Port 465 is SSL (secure: true). Port 587 uses STARTTLS (secure: false).
  const secure = process.env.MAIL_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp-relay.brevo.com",
    port,
    secure,
    auth: {
      user: process.env.MAIL_USER?.trim(),
      pass: process.env.MAIL_PASS?.trim(),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

// Cached transporter instance
let transporter = createTransporter();

/**
 * Refreshes the transporter with current environment credentials.
 */
const refreshTransporter = () => {
  transporter = createTransporter();
  return transporter;
};

/**
 * Verifies SMTP connection and authentication.
 */
const verifyMailConnection = async () => {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
    return { ok: false, message: "SMTP credentials not fully configured in environment." };
  }
  try {
    const transport = refreshTransporter();
    await transport.verify();
    return { ok: true, message: `Connected to ${process.env.MAIL_HOST}` };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};

/**
 * Sends account verification email.
 */
const sendVerificationEmail = async ({ email, username, token }) => {
  const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token.trim())}`;
  const from = getFromAddress();

  const plainText = `Welcome to EchoHub, ${username}!\n\nPlease verify your email address by visiting the link below:\n\n${verifyUrl}\n\nThis verification link expires in 24 hours.\nIf you did not create an EchoHub account, you can safely ignore this email.`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 560px;
        margin: 0 auto;
        padding: 36px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 24px; font-weight: 700;">Welcome to EchoHub</h2>
      </div>

      <p style="color: #f0f6fc; font-size: 16px; line-height: 1.5; margin: 0 0 16px;">
        Hello <strong>${username}</strong>,
      </p>

      <p style="color: #8b949e; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
        Thank you for signing up. Please verify your email address to activate your account and start deploying your projects:
      </p>

      <div style="margin: 28px 0; text-align: left;">
        <a
          href="${verifyUrl}"
          style="
            background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
            color: #ffffff;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);
          "
        >
          Verify Email Address
        </a>
      </div>

      <p style="color: #6e7681; font-size: 13px; margin: 24px 0 8px;">
        If the button above does not work, copy and paste this link into your browser:
      </p>

      <p style="margin: 0 0 24px; word-break: break-all;">
        <a href="${verifyUrl}" style="color: #38bdf8; font-size: 13px; text-decoration: underline;">
          ${verifyUrl}
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #283042; margin: 24px 0;" />

      <p style="color: #6e7681; font-size: 12px; line-height: 1.5; margin: 0;">
        This verification link will expire in <strong>24 hours</strong>.<br />
        If you did not create this account, no further action is required.
      </p>
    </div>
  `;

  try {
    const transport = refreshTransporter();
    const info = await transport.sendMail({
      from,
      to: email,
      subject: "Verify your EchoHub account",
      text: plainText,
      html,
    });
    console.log(`[MailService] Verification email sent to ${email} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[MailService] Failed to send verification email to ${email}:`, err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

/**
 * Sends password reset email.
 */
const sendPasswordResetEmail = async (email, token) => {
  const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token.trim())}`;
  const from = getFromAddress();

  const plainText = `Password Reset Request\n\nWe received a request to reset your EchoHub password. Click the link below to choose a new password:\n\n${resetLink}\n\nThis single-use link expires in 30 minutes.\nIf you did not request this, you can safely ignore this email.`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 560px;
        margin: 0 auto;
        padding: 36px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <h2 style="color: #38bdf8; margin: 0 0 16px; font-size: 24px; font-weight: 700;">Password Reset</h2>

      <p style="color: #8b949e; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        We received a request to reset the password for your EchoHub account. Click the button below to choose a new password:
      </p>

      <div style="margin: 32px 0; text-align: left;">
        <a
          href="${resetLink}"
          style="
            background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
            color: #ffffff;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);
          "
        >
          Reset Password
        </a>
      </div>

      <p style="color: #6e7681; font-size: 13px; margin: 24px 0 8px;">
        If the button above does not work, copy and paste this link into your browser:
      </p>

      <p style="margin: 0 0 24px; word-break: break-all;">
        <a href="${resetLink}" style="color: #38bdf8; font-size: 13px; text-decoration: underline;">
          ${resetLink}
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #283042; margin: 24px 0;" />

      <p style="color: #6e7681; font-size: 12px; line-height: 1.5; margin: 0;">
        This link is <strong>single-use</strong> and will automatically expire in <strong>30 minutes</strong>.<br />
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;

  try {
    const transport = refreshTransporter();
    const info = await transport.sendMail({
      from,
      to: email,
      subject: "Reset your EchoHub password",
      text: plainText,
      html,
    });
    console.log(`[MailService] Password reset email sent to ${email} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[MailService] Failed to send password reset email to ${email}:`, err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyMailConnection,
  getFromAddress,
  refreshTransporter,
};
