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
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"EchoHub" <${process.env.MAIL_USER}>`,

    to: email,

    subject: "Reset your EchoHub password",

    html: `
      <div style="
          font-family:Arial,sans-serif;
          max-width:600px;
          margin:auto;
          padding:30px;
      ">

        <h2>Password Reset</h2>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          Click the button below to choose a new password.
        </p>

        <p style="margin:40px 0;">
          <a
            href="${resetLink}"
            style="
              background:#ff8c32;
              color:white;
              padding:14px 28px;
              text-decoration:none;
              border-radius:8px;
              display:inline-block;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link expires in <strong>30 minutes</strong>.
        </p>

        <p>
          If you didn't request this, simply ignore this email.
        </p>

      </div>
    `,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
