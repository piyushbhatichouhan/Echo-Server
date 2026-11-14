const crypto = require("crypto");
const { pool } = require("../config/database");
const gitService = require("../services/git.service");
const deploymentService = require("../services/deployment.service");

/**
 * Validates HMAC SHA-256 signature against raw payload.
 */
function verifyHmacSignature(rawPayload, signatureHeader, secret) {
  if (!secret) return true; // Signature check skipped if no secret configured
  if (!signatureHeader) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");

  if (signatureHeader.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

/**
 * Extracts payload buffer, JSON object, and git commit metadata.
 */
function parseWebhookRequest(req) {
  const rawPayload =
    req.rawBody ||
    (Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
        ));

  let payload = null;
  if (
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body) &&
    req.body !== null
  ) {
    payload = req.body;
  } else {
    try {
      payload = JSON.parse(rawPayload.toString("utf8"));
    } catch {
      payload = {};
    }
  }

  return { rawPayload, payload };
}

function extractGitMeta(payload, branch) {
  const headCommit =
    payload.head_commit ||
    (Array.isArray(payload.commits) && payload.commits[0]) ||
    {};

  return {
    commitHash: headCommit.id || headCommit.sha || payload.after || null,
    commitMessage: headCommit.message || "Automated webhook push deploy",
    commitAuthor:
      headCommit.author?.name ||
      headCommit.author?.username ||
      payload.pusher?.name ||
      "git-webhook",
    gitBranch: branch,
  };
}

/**
 * Main GitHub Webhook Handler (Supports both /github and /github/:projectId)
 */
const githubWebhook = async (req, res) => {
  const { rawPayload, payload } = parseWebhookRequest(req);
  const targetProjectId = req.params.projectId || req.params.id || null;
  const signature = req.headers["x-hub-signature-256"];
  const event = req.headers["x-github-event"] || (req.headers["x-gitlab-event"] ? "push" : null);

  // Ping / Handshake
  if (event === "ping") {
    return res.status(200).json({ message: "pong" });
  }

  // Project-Specific Webhook Route: /api/webhooks/github/:projectId
  if (targetProjectId) {
    try {
      const { rows } = await pool.query(
        `
        SELECT pr.*, p.owner_id, p.name AS project_name
        FROM project_repository pr
        JOIN projects p ON pr.project_id = p.id
        WHERE pr.project_id = $1
        LIMIT 1
        `,
        [targetProjectId],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Project ${targetProjectId} not found or repository not connected.`,
        });
      }

      const project = rows[0];
      const projectSecret = project.webhook_secret || process.env.GITHUB_WEBHOOK_SECRET;

      // Verify HMAC signature
      if (projectSecret) {
        const valid = verifyHmacSignature(rawPayload, signature, projectSecret);
        if (!valid) {
          return res.status(401).json({
            success: false,
            message: "Invalid webhook HMAC signature.",
          });
        }
      }

      // Check auto-deploy toggle
      if (project.auto_deploy === false) {
        console.log(
          `[Webhook] Push received for project ${project.project_name} (${targetProjectId}), but auto-deploy is disabled.`,
        );
        return res.status(200).json({
          success: true,
          message: "Push received, but auto-deploy is disabled for this project.",
        });
      }

      // Verify branch
      const ref = payload.ref || "";
      const branch = ref.replace("refs/heads/", "");
      if (project.branch && branch && project.branch !== branch) {
        console.log(
          `[Webhook] Ignored push to branch '${branch}' for project ${targetProjectId} (configured branch: '${project.branch}').`,
        );
        return res.status(200).json({
          success: true,
          message: `Ignored push to branch '${branch}'. Configured branch is '${project.branch}'.`,
        });
      }

      const gitMeta = extractGitMeta(payload, branch || project.branch || "main");

      console.log(
        `[Webhook] Triggering auto-deploy for project '${project.project_name}' (${targetProjectId}) from commit ${gitMeta.commitHash?.slice(0, 7) || "HEAD"}`,
      );

      // Async background pull and deploy
      gitService
        .updateRepository(project.project_id, project.owner_id)
        .then(() =>
          deploymentService.deployProject(
            project.project_id,
            project.owner_id,
            gitMeta,
          ),
        )
        .then((deployment) => {
          console.log(
            `[Webhook] Successfully auto-deployed project ${targetProjectId} (deployment: ${deployment?.id})`,
          );
        })
        .catch((err) => {
          console.error(
            `[Webhook] Auto-deploy failure for project ${targetProjectId}:`,
            err.message,
          );
        });

      return res.status(200).json({
        success: true,
        message: `Push accepted. Auto-deploy triggered for ${project.project_name}.`,
        commit: gitMeta.commitHash,
      });
    } catch (err) {
      console.error("[Webhook Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Global Multi-Tenant Webhook: /api/webhooks/github
  const globalSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (globalSecret) {
    const valid = verifyHmacSignature(rawPayload, signature, globalSecret);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid global webhook signature.",
      });
    }
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
        SELECT pr.*, p.owner_id, p.name AS project_name
        FROM project_repository pr
        JOIN projects p ON pr.project_id = p.id
        WHERE (pr.repository_url ILIKE $1 OR pr.clone_url ILIKE $1 OR (pr.owner ILIKE $2 AND pr.repository_name ILIKE $3))
        `,
        [repoUrl, ownerName, repoName],
      );

      let triggeredCount = 0;
      for (const project of projects) {
        if (project.auto_deploy === false) {
          continue;
        }

        if (!project.branch || project.branch === branch) {
          triggeredCount++;
          const gitMeta = extractGitMeta(payload, branch);

          console.log(
            `[Webhook] Global trigger: Auto-deploying project ${project.project_id} (branch: ${branch})`,
          );

          gitService
            .updateRepository(project.project_id, project.owner_id)
            .then(() =>
              deploymentService.deployProject(
                project.project_id,
                project.owner_id,
                gitMeta,
              ),
            )
            .catch((err) =>
              console.error(
                `[Webhook] Global deployment error for project ${project.project_id}:`,
                err.message,
              ),
            );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Webhook processed. Found ${projects.length} matching project(s), triggered ${triggeredCount}.`,
      });
    } catch (dbErr) {
      console.error("[Webhook] DB query error:", dbErr.message);
      return res.status(500).json({ success: false, message: dbErr.message });
    }
  }

  return res.sendStatus(200);
};

module.exports = {
  githubWebhook,
};
