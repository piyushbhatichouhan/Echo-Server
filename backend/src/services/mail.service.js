const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendVerificationEmail = async ({ email, username, token }) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Verify your EchoHub account",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome to EchoHub!</h2>

        <p>Hello <strong>${username}</strong>,</p>

        <p>Please verify your email by clicking the button below.</p>

        <p>
          <a
            href="${verifyUrl}"
            style="
              background:#ff9800;
              color:white;
              text-decoration:none;
              padding:12px 20px;
              border-radius:6px;
              display:inline-block;
            "
          >
            Verify Email
          </a>
        </p>

        <p>This link expires in 24 hours.</p>

        <p>If you didn't create this account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token.trim())}`;

  await transporter.sendMail({
    from: `"EchoHub" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Reset your EchoHub password",
    text: `Password Reset Request\n\nWe received a request to reset your EchoHub password. Click the link below to choose a new password:\n\n${resetLink}\n\nThis single-use link expires in 30 minutes.\nIf you did not request this, you can safely ignore this email.`,
    html: `
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
    `,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
