const crypto = require("crypto");

const githubWebhook = async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    return res.status(401).json({
      success: false,
      message: "Missing signature",
    });
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );

  if (!valid) {
    return res.status(401).json({
      success: false,
      message: "Invalid signature",
    });
  }

  console.log("GitHub signature verified.");

  res.sendStatus(200);
};

module.exports = {
  githubWebhook,
};
