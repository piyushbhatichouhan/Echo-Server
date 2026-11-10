const { sendMail } = require("./mail.service");

const DEFAULT_ADMIN_EMAIL = "piyushbhatichouhan@gmail.com";

/**
 * Returns the configured administrator email address for platform notifications.
 */
const getAdminRecipient = () => {
  return (
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    process.env.SUPER_ADMIN_EMAIL?.trim() ||
    DEFAULT_ADMIN_EMAIL
  );
};

/**
 * Returns the base URL for frontend links.
 */
const getFrontendUrl = () => {
  return (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "https://devpiyush.in"
  )
    .trim()
    .replace(/\/+$/, "");
};

// -------------------------------------------------------------
// Rate Limiting & Error Deduplication
// -------------------------------------------------------------
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per identical error signature
const GLOBAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_GLOBAL_ERRORS_PER_WINDOW = 6;

const errorCooldownMap = new Map(); // signature -> { firstSeen, lastAlerted, count }
const globalAlertTimestamps = [];

// Periodically purge stale deduplication entries
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of errorCooldownMap.entries()) {
    if (now - val.lastAlerted > COOLDOWN_MS * 2) {
      errorCooldownMap.delete(key);
    }
  }
}, 15 * 60 * 1000).unref();

const computeErrorSignature = (error, source) => {
  const msg = String(error?.message || error || "Unknown Error").slice(0, 160);
  const name = String(error?.name || "Error");
  const code = String(error?.code || "");
  return `${source}:${name}:${code}:${msg}`;
};

/**
 * Determines whether a critical error should trigger an email alert or be throttled.
 */
const shouldAlertError = (signature) => {
  const now = Date.now();

  // Prune global window
  while (
    globalAlertTimestamps.length > 0 &&
    now - globalAlertTimestamps[0] > GLOBAL_WINDOW_MS
  ) {
    globalAlertTimestamps.shift();
  }

  // Check global rate limit
  if (globalAlertTimestamps.length >= MAX_GLOBAL_ERRORS_PER_WINDOW) {
    return { shouldAlert: false, reason: "GLOBAL_RATE_LIMIT", count: 0 };
  }

  // Check signature cooldown
  const entry = errorCooldownMap.get(signature);
  if (entry) {
    entry.count += 1;
    if (now - entry.lastAlerted < COOLDOWN_MS) {
      return { shouldAlert: false, reason: "SIGNATURE_COOLDOWN", count: entry.count };
    }
    // Cooldown elapsed: trigger with accumulated count
    const suppressedCount = entry.count;
    entry.lastAlerted = now;
    entry.count = 1;
    globalAlertTimestamps.push(now);
    return { shouldAlert: true, count: suppressedCount };
  }

  // First time seeing this signature
  errorCooldownMap.set(signature, {
    firstSeen: now,
    lastAlerted: now,
    count: 1,
  });
  globalAlertTimestamps.push(now);
  return { shouldAlert: true, count: 1 };
};

// -------------------------------------------------------------
// Subdomain Request Notification
// -------------------------------------------------------------

/**
 * Sends an email notification to the Super Admin when a developer requests a custom subdomain.
 */
const notifySubdomainRequest = async ({
  project = {},
  user = {},
  subdomain,
  hostname,
  requestId = null,
}) => {
  const recipient = getAdminRecipient();
  const frontendUrl = getFrontendUrl();
  const reviewUrl = `${frontendUrl}/server/subdomains`;
  const timestamp = new Date().toUTCString();

  const projectName = project.name || "Untitled Project";
  const projectId = project.id || "N/A";
  const developerName = user.username || "Developer";
  const developerEmail = user.email || "No email available";

  const subject = `🌐 [EchoServer] Custom Subdomain Requested: ${subdomain}`;

  const plainText = `[EchoServer Platform] New Custom Subdomain Request

A developer has submitted a new custom subdomain request that requires Super Admin review:

• Subdomain:  https://${hostname} (${subdomain})
• Project:    ${projectName} (ID: ${projectId})
• Developer:  ${developerName} (${developerEmail})
• Submitted:  ${timestamp}

Review and approve this request in Server Settings:
${reviewUrl}
`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 32px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #21262d; padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ffaa33; background: rgba(255, 170, 0, 0.12); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255, 170, 0, 0.3);">
            Domain Request
          </span>
          <h2 style="color: #f0f6fc; margin: 12px 0 0; font-size: 22px; font-weight: 700;">
            Custom Subdomain Requested
          </h2>
        </div>
      </div>

      <p style="color: #8b949e; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
        A developer has requested authorization for an exclusive custom subdomain on <strong>EchoServer</strong>.
      </p>

      <!-- Subdomain Highlight Box -->
      <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #7dd3fc; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
          Requested Subdomain
        </span>
        <div style="font-size: 20px; font-weight: 700; color: #38bdf8; font-family: ui-monospace, SFMono-Regular, monospace; word-break: break-all;">
          https://${hostname}
        </div>
      </div>

      <!-- Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 14px;">
        <tbody>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; width: 140px; font-weight: 500;">Developer</td>
            <td style="padding: 10px 0; color: #f0f6fc; font-weight: 600;">
              ${developerName} <span style="color: #8b949e; font-weight: 400;">(${developerEmail})</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Project</td>
            <td style="padding: 10px 0; color: #f0f6fc; font-weight: 600;">
              ${projectName} <span style="color: #6e7681; font-size: 12px; font-family: monospace;">(${projectId})</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Subdomain Prefix</td>
            <td style="padding: 10px 0; color: #ffaa33; font-weight: 600; font-family: monospace;">
              ${subdomain}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Request Time</td>
            <td style="padding: 10px 0; color: #c9d1d9;">${timestamp}</td>
          </tr>
        </tbody>
      </table>

      <!-- Call to Action -->
      <div style="text-align: left; margin: 28px 0;">
        <a
          href="${reviewUrl}"
          style="
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #ffffff;
            padding: 13px 26px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
          "
        >
          Review in Server Settings →
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #21262d; margin: 24px 0;" />

      <p style="color: #6e7681; font-size: 12px; line-height: 1.5; margin: 0;">
        You received this email because you are the Super Administrator of this EchoServer instance.<br />
        To adjust alert settings, update <code style="color: #8b949e;">ADMIN_ALERT_EMAIL</code> in your server environment.
      </p>
    </div>
  `;

  try {
    const info = await sendMail({
      to: recipient,
      subject,
      text: plainText,
      html,
    });
    console.log(`[Notification] Custom subdomain request email sent to ${recipient} (subdomain: ${subdomain})`);
    return { ok: true, recipient, messageId: info?.messageId };
  } catch (err) {
    console.error(`[Notification] Failed to send custom subdomain request email to ${recipient}:`, err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Sends an email notification to the Super Admin whenever a privileged user assigns or updates a custom subdomain.
 */
const notifyCustomSubdomainAssigned = async ({
  project = {},
  user = {},
  subdomain,
  hostname,
  action = "assigned",
}) => {
  const recipient = getAdminRecipient();
  const frontendUrl = getFrontendUrl();
  const reviewUrl = `${frontendUrl}/server/subdomains`;
  const liveUrl = `https://${hostname}`;
  const timestamp = new Date().toUTCString();

  const projectName = project.name || "Untitled Project";
  const projectId = project.id || "N/A";
  const developerName = user.username || "Developer";
  const developerEmail = user.email || "No email available";

  const actionVerb = action === "updated" ? "Updated" : "Assigned & Published";
  const subject = `🌐 [EchoServer] Custom Subdomain ${actionVerb}: ${subdomain}`;

  const plainText = `[EchoServer Platform] Custom Subdomain ${actionVerb}

A user with custom subdomain privileges has ${action === "updated" ? "updated their project to" : "assigned and published"} a custom subdomain:

• Subdomain:  ${liveUrl} (${subdomain})
• Project:    ${projectName} (ID: ${projectId})
• Developer:  ${developerName} (${developerEmail})
• Action:     ${actionVerb}
• Timestamp:  ${timestamp}

Manage all custom subdomains in Server Settings:
${reviewUrl}
`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 32px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #21262d; padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(56, 189, 248, 0.3);">
            Domain Assigned
          </span>
          <h2 style="color: #f0f6fc; margin: 12px 0 0; font-size: 22px; font-weight: 700;">
            Custom Subdomain ${actionVerb}
          </h2>
        </div>
      </div>

      <p style="color: #8b949e; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
        A developer with custom subdomain privileges has claimed and activated an exclusive custom subdomain on <strong>EchoServer</strong>.
      </p>

      <!-- Subdomain Highlight Box -->
      <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #7dd3fc; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
          Active Custom Subdomain
        </span>
        <div style="font-size: 20px; font-weight: 700; color: #38bdf8; font-family: ui-monospace, SFMono-Regular, monospace; word-break: break-all;">
          ${liveUrl}
        </div>
      </div>

      <!-- Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 14px;">
        <tbody>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; width: 140px; font-weight: 500;">Developer</td>
            <td style="padding: 10px 0; color: #f0f6fc; font-weight: 600;">
              ${developerName} <span style="color: #8b949e; font-weight: 400;">(${developerEmail})</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Project</td>
            <td style="padding: 10px 0; color: #f0f6fc; font-weight: 600;">
              ${projectName} <span style="color: #6e7681; font-size: 12px; font-family: monospace;">(${projectId})</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Subdomain Prefix</td>
            <td style="padding: 10px 0; color: #38bdf8; font-weight: 600; font-family: monospace;">
              ${subdomain}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Action Type</td>
            <td style="padding: 10px 0; color: #a78bfa; font-weight: 600;">
              ${actionVerb} (No approval required)
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #8b949e; font-weight: 500;">Assigned Time</td>
            <td style="padding: 10px 0; color: #c9d1d9;">${timestamp}</td>
          </tr>
        </tbody>
      </table>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 12px; margin: 28px 0; flex-wrap: wrap;">
        <a
          href="${reviewUrl}"
          style="
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            padding: 12px 22px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.3);
          "
        >
          Manage in Server Settings →
        </a>
        <a
          href="${liveUrl}"
          target="_blank"
          style="
            background: #21262d;
            color: #f0f6fc;
            padding: 12px 22px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 14px;
            border: 1px solid #30363d;
          "
        >
          Open Live Website ↗
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #21262d; margin: 24px 0;" />

      <p style="color: #6e7681; font-size: 12px; line-height: 1.5; margin: 0;">
        You received this notification because you are the Super Administrator of this EchoServer platform.<br />
        If you wish to revoke or reassign this subdomain, you can do so at any time in Server Settings.
      </p>
    </div>
  `;

  try {
    const info = await sendMail({
      to: recipient,
      subject,
      text: plainText,
      html,
    });
    console.log(`[Notification] Custom subdomain assigned email sent to ${recipient} (subdomain: ${subdomain})`);
    return { ok: true, recipient, messageId: info?.messageId };
  } catch (err) {
    console.error(`[Notification] Failed to send custom subdomain assigned email to ${recipient}:`, err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Sends an email notification to the project owner when an individual custom domain is revoked by the Super Admin.
 */
const notifyDeveloperSubdomainRevoked = async ({
  project = {},
  user = {},
  subdomain,
  hostname,
  standardHostname,
  reason = null,
}) => {
  if (!user?.email) return { ok: false, error: "No user email" };

  const frontendUrl = getFrontendUrl();
  const projectUrl = `${frontendUrl}/projects/${project.id}`;
  const timestamp = new Date().toUTCString();

  const projectName = project.name || "Your Project";
  const developerName = user.username || "Developer";
  const rejectionReason = reason?.trim() || "Revoked by Super Administrator.";

  const subject = `⚠️ [EchoServer] Custom Subdomain Revoked for "${projectName}"`;

  const plainText = `[EchoServer Platform] Custom Subdomain Revoked

Hello ${developerName},

The custom subdomain https://${hostname} assigned to your project "${projectName}" has been revoked by the Super Administrator.

• Revoked Subdomain:  https://${hostname}
• Active Standard URL: https://${standardHostname}
• Reason:              ${rejectionReason}
• Timestamp:           ${timestamp}

Your project has been automatically reverted to its standard domain and remains live.
View your project settings:
${projectUrl}
`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 32px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <div style="border-bottom: 1px solid #21262d; padding-bottom: 20px; margin-bottom: 24px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #f87171; background: rgba(248, 113, 113, 0.12); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(248, 113, 113, 0.3);">
          Domain Revoked
        </span>
        <h2 style="color: #f0f6fc; margin: 12px 0 0; font-size: 22px; font-weight: 700;">
          Custom Subdomain Revoked
        </h2>
      </div>

      <p style="color: #8b949e; font-size: 15px; line-height: 1.5; margin: 0 0 20px;">
        Hello <strong>${developerName}</strong>, the custom subdomain for your project <strong>${projectName}</strong> was revoked by the platform Super Administrator.
      </p>

      <div style="background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #fca5a5; display: block; margin-bottom: 6px;">
          Revoked Subdomain
        </span>
        <div style="font-size: 18px; font-weight: 700; color: #f87171; font-family: monospace; text-decoration: line-through;">
          https://${hostname}
        </div>
      </div>

      ${
        rejectionReason
          ? `
      <div style="background: #161b22; border-left: 4px solid #f87171; border-radius: 4px 10px 10px 4px; padding: 14px 18px; margin-bottom: 24px;">
        <strong style="color: #f0f6fc; font-size: 13px; display: block; margin-bottom: 4px;">Reason / Admin Note:</strong>
        <span style="color: #c9d1d9; font-size: 14px; line-height: 1.5;">${rejectionReason}</span>
      </div>`
          : ""
      }

      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6ee7b7; display: block; margin-bottom: 6px;">
          Active Replacement Endpoint
        </span>
        <div style="font-size: 16px; font-weight: 700; color: #10b981; font-family: monospace;">
          https://${standardHostname}
        </div>
        <p style="color: #8b949e; font-size: 12px; margin: 6px 0 0;">
          Your project remains active and online via this standard hostname.
        </p>
      </div>

      <div style="margin: 28px 0;">
        <a
          href="${projectUrl}"
          style="
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 14px;
          "
        >
          Open Project Settings →
        </a>
      </div>

      <div style="border-top: 1px solid #21262d; padding-top: 16px; margin-top: 24px; color: #6e7681; font-size: 12px;">
        This alert was delivered to your registered EchoServer account email: <strong style="color: #8b949e;">${user.email}</strong>.
      </div>
    </div>
  `;

  try {
    const info = await sendMail({
      to: user.email,
      subject,
      text: plainText,
      html,
    });
    console.log(`[Notification] Custom subdomain revocation email sent to ${user.email}`);
    return { ok: true, recipient: user.email, messageId: info?.messageId };
  } catch (err) {
    console.error(`[Notification] Failed to send revocation email to ${user.email}:`, err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Sends an email notification to the user when their platform custom subdomain privilege is revoked by the Super Admin.
 */
const notifyDeveloperPrivilegeRevoked = async ({
  user = {},
  revertedProjects = [],
  reason = null,
}) => {
  if (!user?.email) return { ok: false, error: "No user email" };

  const frontendUrl = getFrontendUrl();
  const dashboardUrl = `${frontendUrl}/dashboard`;
  const timestamp = new Date().toUTCString();

  const developerName = user.username || "Developer";
  const revocationReason = reason?.trim() || "Administrative policy update.";

  const subject = `⚠️ [EchoServer] Custom Subdomain Privilege Revoked`;

  let projectListText = "";
  let projectListHtml = "";

  if (revertedProjects.length > 0) {
    projectListText =
      `\nThe following active project(s) were automatically reverted to their default standard domains:\n` +
      revertedProjects
        .map(
          (p) =>
            `• ${p.name}: https://${p.revertedHostname} (previously https://${p.oldHostname || "custom"})`,
        )
        .join("\n") +
      "\n";

    projectListHtml = `
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6ee7b7; display: block; margin-bottom: 8px;">
          Active Replacement Endpoint(s)
        </span>
        <ul style="margin: 0; padding-left: 20px; color: #c9d1d9; font-size: 14px; line-height: 1.6;">
          ${revertedProjects
            .map(
              (p) => `
            <li style="margin-bottom: 6px;">
              <strong>${p.name}</strong>: <code style="color: #10b981; font-family: monospace;">https://${p.revertedHostname}</code>
            </li>
          `,
            )
            .join("")}
        </ul>
        <p style="color: #8b949e; font-size: 12px; margin: 8px 0 0;">
          Your projects remain live and accessible through these standard hostnames.
        </p>
      </div>
    `;
  }

  const plainText = `[EchoServer Platform] Custom Subdomain Privilege Revoked

Hello ${developerName},

Your custom subdomain privilege on EchoServer has been revoked by the platform Super Administrator.
${projectListText}
• Reason:    ${revocationReason}
• Timestamp: ${timestamp}

You can continue deploying projects using standard default subdomains (username-project.devpiyush.in).
View your projects:
${dashboardUrl}
`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 32px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <div style="border-bottom: 1px solid #21262d; padding-bottom: 20px; margin-bottom: 24px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #f87171; background: rgba(248, 113, 113, 0.12); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(248, 113, 113, 0.3);">
          Access Revoked
        </span>
        <h2 style="color: #f0f6fc; margin: 12px 0 0; font-size: 22px; font-weight: 700;">
          Custom Subdomain Privilege Revoked
        </h2>
      </div>

      <p style="color: #8b949e; font-size: 15px; line-height: 1.5; margin: 0 0 20px;">
        Hello <strong>${developerName}</strong>, your privilege to configure custom subdomains on EchoServer has been revoked by the Super Administrator.
      </p>

      ${projectListHtml}

      ${
        revocationReason
          ? `
      <div style="background: #161b22; border-left: 4px solid #f87171; border-radius: 4px 10px 10px 4px; padding: 14px 18px; margin-bottom: 24px;">
        <strong style="color: #f0f6fc; font-size: 13px; display: block; margin-bottom: 4px;">Reason / Admin Note:</strong>
        <span style="color: #c9d1d9; font-size: 14px; line-height: 1.5;">${revocationReason}</span>
      </div>`
          : ""
      }

      <p style="color: #8b949e; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
        You can continue to deploy and publish projects using standard default subdomains.
      </p>

      <div style="margin: 28px 0;">
        <a
          href="${dashboardUrl}"
          style="
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 14px;
          "
        >
          Go to Dashboard →
        </a>
      </div>

      <div style="border-top: 1px solid #21262d; padding-top: 16px; margin-top: 24px; color: #6e7681; font-size: 12px;">
        This alert was delivered to your registered EchoServer account email: <strong style="color: #8b949e;">${user.email}</strong>.
      </div>
    </div>
  `;

  try {
    const info = await sendMail({
      to: user.email,
      subject,
      text: plainText,
      html,
    });
    console.log(`[Notification] Custom subdomain privilege revocation email sent to ${user.email}`);
    return { ok: true, recipient: user.email, messageId: info?.messageId };
  } catch (err) {
    console.error(`[Notification] Failed to send privilege revocation email to ${user.email}:`, err.message);
    return { ok: false, error: err.message };
  }
};

// -------------------------------------------------------------
// Critical Error Notification
// -------------------------------------------------------------

/**
 * Determines whether an error is a user project error, deployment failure,
 * user Dockerfile/application bug, or client error, which should NOT trigger
 * platform infrastructure alerts to the Super Admin.
 */
const isUserOrDeploymentError = (error, source = "", req = null) => {
  if (error?.isUserError || error?.userFacing || error?.isBuildError) {
    return true;
  }

  const rawStatus = Number(error?.status || req?.statusCode);
  if (rawStatus >= 400 && rawStatus < 500) {
    return true;
  }

  const rawUrl = req?.originalUrl || req?.url || "";
  const isUserProjectRoute =
    rawUrl.includes("/api/projects/") ||
    rawUrl.includes("/api/deployments") ||
    rawUrl.includes("/api/git");

  const msg = String(error?.message || error || "").toLowerCase();
  const src = String(source || "").toLowerCase();

  if (
    src.includes("deploy") ||
    src.includes("build") ||
    src.includes("git")
  ) {
    if (!msg.includes("docker daemon") && !msg.includes("econnrefused")) {
      return true;
    }
  }

  const userErrorKeywords = [
    "returned a non-zero code",
    "copy failed",
    "file not found in build context",
    "file does not exist",
    "no such file or directory",
    "no dockerfile",
    "dockerfile not found",
    "failed to solve with frontend",
    "failed to compute cache key",
    "docker build timed out",
    "exited prematurely",
    "did not respond to http probe",
    "simple-git",
    "repository not connected",
    "invalid github repository",
    "not a git repository",
    "merge conflict",
    "git clone",
    "git pull",
    "git push",
    "authentication failed",
    "could not read username",
    "remote branch",
    "npm err!",
    "yarn error",
    "pnpm",
    "corepack",
    "command not found",
    ": not found",
    "modulenotfounderror",
    "cannot find module",
    "syntaxerror",
    "pip install",
    "requirements.txt",
    "working directory",
    "target deployment not found",
    "project not found",
  ];

  if (userErrorKeywords.some((keyword) => msg.includes(keyword))) {
    return true;
  }

  if (isUserProjectRoute) {
    const isInfrastructureError =
      msg.includes("econnrefused") ||
      msg.includes("connect enoent") ||
      msg.includes("docker daemon") ||
      rawStatus === 503 ||
      rawStatus === 507;

    if (!isInfrastructureError) {
      return true;
    }
  }

  return false;
};

/**
 * Sends an email notification to the Super Admin whenever a critical error occurs on the server.
 */
const notifyCriticalError = async ({
  error,
  source = "Server Error",
  req = null,
  context = null,
}) => {
  const errObj = error instanceof Error ? error : new Error(String(error || "Unknown Error"));

  // Never send infrastructure alert emails for user application or deployment failures
  if (isUserOrDeploymentError(errObj, source, req)) {
    console.log(
      `[Notification] Suppressed critical alert email: Not a platform infrastructure failure ("${errObj.message}" | Source: ${source})`,
    );
    return { ok: false, ignored: true, reason: "USER_PROJECT_ERROR" };
  }

  const signature = computeErrorSignature(errObj, source);

  const check = shouldAlertError(signature);
  if (!check.shouldAlert) {
    console.log(
      `[Notification] Throttling critical error email for "${signature}" (Reason: ${check.reason}, Occurrences: ${check.count})`,
    );
    return { ok: false, throttled: true, reason: check.reason };
  }

  const recipient = getAdminRecipient();
  const frontendUrl = getFrontendUrl();
  const logsUrl = `${frontendUrl}/server/logs`;
  const timestamp = new Date().toUTCString();

  const errorMessage = errObj.message || "An unexpected critical error occurred.";
  const errorStack = errObj.stack || "No stack trace available.";
  const errorCode = errObj.code || (req?.statusCode ? `${req.statusCode}` : "500");

  // System snapshot
  const memory = process.memoryUsage();
  const rssMB = Math.round(memory.rss / (1024 * 1024));
  const heapUsedMB = Math.round(memory.heapUsed / (1024 * 1024));
  const uptimeSec = Math.floor(process.uptime());

  // Request context if available (sanitize sensitive query parameters like ?token=)
  const reqMethod = req?.method || null;
  const rawPath = req?.originalUrl || req?.url || null;
  const reqPath = rawPath ? rawPath.replace(/([?&]token=)[^&#]+/gi, "$1[REDACTED]") : null;
  const reqIp = req?.ip || req?.socket?.remoteAddress || null;
  const reqUser = req?.user?.username
    ? `${req.user.username} (${req.user.email || req.user.id})`
    : null;

  const subject = `🚨 [CRITICAL ALERT] ${source}: ${errorMessage.slice(0, 60)}`;

  const plainText = `[CRITICAL SERVER ALERT] ${source}

A critical error has occurred on EchoServer that requires attention:

• Source:    ${source}
• Message:   ${errorMessage}
• Code:      ${errorCode}
• Timestamp: ${timestamp}
${check.count > 1 ? `• Occurrences: ${check.count} in the last 10 minutes\n` : ""}${
    reqMethod && reqPath ? `• Request:   ${reqMethod} ${reqPath}\n` : ""
  }${reqUser ? `• User:      ${reqUser}\n` : ""}${reqIp ? `• Client IP: ${reqIp}\n` : ""}
• System:    Node ${process.version} | RSS: ${rssMB}MB | Heap: ${heapUsedMB}MB | Uptime: ${uptimeSec}s

Stack Trace:
${errorStack}

Inspect Server Logs:
${logsUrl}
`;

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 660px;
        margin: 0 auto;
        padding: 32px 24px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #442025;
    ">
      <!-- Alert Header -->
      <div style="border-bottom: 1px solid #30181d; padding-bottom: 18px; margin-bottom: 22px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ef4444; background: rgba(239, 68, 68, 0.16); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(239, 68, 68, 0.35);">
            CRITICAL INCIDENT
          </span>
          <span style="font-size: 12px; color: #8b949e; font-family: monospace;">${timestamp}</span>
        </div>
        <h2 style="color: #fca5a5; margin: 0; font-size: 20px; font-weight: 700;">
          ${source}
        </h2>
      </div>

      ${
        check.count > 1
          ? `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; color: #fcd34d; font-size: 13px;">
          ⚠ <strong>Alert Throttling Active:</strong> This error occurred <strong>${check.count} times</strong> during the last 10 minutes.
        </div>
        `
          : ""
      }

      <!-- Error Message Callout -->
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px 18px; margin-bottom: 22px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #f87171; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
          Error Details (${errorCode})
        </span>
        <div style="font-size: 15px; font-weight: 600; color: #fecaca; line-height: 1.45; word-break: break-word;">
          ${errorMessage}
        </div>
      </div>

      <!-- Context Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
        <tbody>
          ${
            reqMethod && reqPath
              ? `
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 0; color: #8b949e; width: 120px;">Request Route</td>
              <td style="padding: 8px 0; color: #f0f6fc; font-family: monospace; font-weight: 600;">
                <span style="color: #38bdf8;">${reqMethod}</span> ${reqPath}
              </td>
            </tr>
            `
              : ""
          }
          ${
            reqUser
              ? `
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 0; color: #8b949e;">User Context</td>
              <td style="padding: 8px 0; color: #f0f6fc; font-weight: 600;">${reqUser}</td>
            </tr>
            `
              : ""
          }
          ${
            reqIp
              ? `
            <tr style="border-bottom: 1px solid #21262d;">
              <td style="padding: 8px 0; color: #8b949e;">Client IP</td>
              <td style="padding: 8px 0; color: #c9d1d9; font-family: monospace;">${reqIp}</td>
            </tr>
            `
              : ""
          }
          <tr style="border-bottom: 1px solid #21262d;">
            <td style="padding: 8px 0; color: #8b949e;">System Resources</td>
            <td style="padding: 8px 0; color: #c9d1d9; font-size: 12px; font-family: monospace;">
              RSS: ${rssMB} MB &bull; Heap: ${heapUsedMB} MB &bull; Uptime: ${uptimeSec}s
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8b949e;">Node / Platform</td>
            <td style="padding: 8px 0; color: #c9d1d9; font-size: 12px; font-family: monospace;">
              Node ${process.version} (${process.platform})
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Stack Trace -->
      <div style="margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 600; color: #8b949e; display: block; margin-bottom: 8px;">
          Stack Trace
        </span>
        <pre style="
          background: #05070a;
          border: 1px solid #21262d;
          border-radius: 10px;
          padding: 14px 16px;
          margin: 0;
          color: #fca5a5;
          font-size: 11.5px;
          line-height: 1.5;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 280px;
        ">${errorStack}</pre>
      </div>

      <!-- Action Button -->
      <div style="text-align: left; margin: 24px 0 16px;">
        <a
          href="${logsUrl}"
          style="
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 13.5px;
            box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
          "
        >
          View Server Logs →
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #21262d; margin: 20px 0;" />

      <p style="color: #6e7681; font-size: 12px; line-height: 1.5; margin: 0;">
        Automated alert generated by EchoServer Error Sentinel. You are receiving this because you are configured as the platform administrator (<code style="color: #8b949e;">${recipient}</code>).
      </p>
    </div>
  `;

  try {
    const info = await sendMail({
      to: recipient,
      subject,
      text: plainText,
      html,
    });
    console.log(`[Notification] Critical error alert email sent to ${recipient} (Source: ${source})`);
    return { ok: true, recipient, messageId: info?.messageId };
  } catch (err) {
    console.error(`[Notification] Failed to send critical error email to ${recipient}:`, err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Sends a test notification to verify SMTP and notification pipeline.
 */
const sendTestNotification = async (type = "subdomain") => {
  if (type === "error") {
    const testErr = new Error("This is a simulated critical server exception to test the notification system.");
    testErr.code = "ERR_SIMULATED_TEST";
    return await notifyCriticalError({
      error: testErr,
      source: "Manual Sentinel Diagnostic Test",
    });
  }

  if (type === "revoked") {
    return await notifyDeveloperSubdomainRevoked({
      project: {
        id: "proj_test_12345678",
        name: "Sample Diagnostic App",
      },
      user: {
        id: "usr_test_98765432",
        username: "test-developer",
        email: getAdminRecipient(),
      },
      subdomain: "test-app",
      hostname: "test-app.devpiyush.in",
      standardHostname: "test-developer-sample-diagnostic.devpiyush.in",
      reason: "Administrative policy revocation test.",
    });
  }

  return await notifySubdomainRequest({
    project: {
      id: "proj_test_12345678",
      name: "Sample Diagnostic App",
    },
    user: {
      id: "usr_test_98765432",
      username: "test-developer",
      email: "developer@devpiyush.in",
    },
    subdomain: "test-app",
    hostname: "test-app.devpiyush.in",
    requestId: "req_test_00000000",
  });
};

module.exports = {
  getAdminRecipient,
  notifySubdomainRequest,
  notifyCustomSubdomainAssigned,
  notifyDeveloperSubdomainRevoked,
  notifyDeveloperPrivilegeRevoked,
  notifyCriticalError,
  sendTestNotification,
};

