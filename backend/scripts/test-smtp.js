require("dotenv").config();
const { verifyMailConnection, getFromAddress, sendVerificationEmail } = require("../src/services/mail.service");

async function main() {
  console.log("==========================================");
  console.log(" EchoHub SMTP & Custom Domain Mail Tester");
  console.log("==========================================");
  console.log(`Host:     ${process.env.MAIL_HOST || "not set"}`);
  console.log(`Port:     ${process.env.MAIL_PORT || "587"}`);
  console.log(`User:     ${process.env.MAIL_USER || "not set"}`);
  console.log(`From:     ${getFromAddress()}`);
  console.log("------------------------------------------");
  console.log("Testing connection...");

  const check = await verifyMailConnection();
  if (check.ok) {
    console.log("✓ SUCCESS: SMTP connection & authentication succeeded!");
  } else {
    console.error(`✗ FAILED: ${check.message}`);
    process.exit(1);
  }

  const targetEmail = process.argv[2];
  if (targetEmail) {
    console.log(`Sending sample verification email to: ${targetEmail}...`);
    try {
      await sendVerificationEmail({
        email: targetEmail,
        username: "Tester",
        token: "sample-test-token-12345",
      });
      console.log(`✓ Sample email dispatched to ${targetEmail}! Check your inbox/spam.`);
    } catch (err) {
      console.error(`✗ Failed to send sample email: ${err.message}`);
    }
  } else {
    console.log("");
    console.log("Tip: Run 'node scripts/test-smtp.js your-email@example.com' to send a real test email.");
  }
}

main().catch(console.error);
