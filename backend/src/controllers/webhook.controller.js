const crypto = require("crypto");
const { pool } = require("../config/database");
const gitService = require("../services/git.service");
const deploymentService = require("../services/deployment.service");

const githubWebhook = async (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (secret) {
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
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

    const valid =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid signature",
      });
    }
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid JSON payload" });
  }

  const event = req.headers["x-github-event"];
  if (event === "ping") {
    return res.status(200).json({ message: "pong" });
  }

  if (event === "push") {
    const ref = payload.ref || "";
    const branch = ref.replace("refs/heads/", "");
    const repoUrl = payload.repository?.html_url || payload.repository?.clone_url || "";
    const repoName = payload.repository?.name || "";
    const ownerName =
      payload.repository?.owner?.login || payload.repository?.owner?.name || "";

    try {
      const { rows: projects } = await pool.query(
        `
        SELECT pr.project_id, pr.branch, p.owner_id
        FROM project_repository pr
        JOIN projects p ON pr.project_id = p.id
        WHERE (pr.repository_url ILIKE $1 OR pr.clone_url ILIKE $1 OR (pr.owner ILIKE $2 AND pr.repository_name ILIKE $3))
        `,
        [repoUrl, ownerName, repoName],
      );

      for (const project of projects) {
        if (!project.branch || project.branch === branch) {
          console.log(
            `[Webhook] Triggering auto-deploy for project ${project.project_id} (branch: ${branch})`,
          );
          // Sync repository in background
          gitService
            .updateRepository(project.project_id, project.owner_id)
            .then(() => deploymentService.deployProject(project.project_id, project.owner_id))
            .catch((err) =>
              console.error(
                `[Webhook] Deployment error for project ${project.project_id}:`,
                err.message,
              ),
            );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Webhook processed. Found ${projects.length} matching project(s).`,
      });
    } catch (dbErr) {
      console.error("[Webhook] DB query error:", dbErr.message);
      return res.status(500).json({ success: false, message: dbErr.message });
    }
  }

  res.sendStatus(200);
};

module.exports = {
  githubWebhook,
};

