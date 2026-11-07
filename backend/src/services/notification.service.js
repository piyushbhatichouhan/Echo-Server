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

  const subject = `🌐 [EchoHub] Custom Subdomain Requested: ${subdomain}`;

  const plainText = `[EchoHub Platform] New Custom Subdomain Request

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
        A developer has requested authorization for an exclusive custom subdomain on <strong>EchoHub</strong>.
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
        You received this email because you are the Super Administrator of this EchoHub instance.<br />
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

// -------------------------------------------------------------
// Critical Error Notification
// -------------------------------------------------------------

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

  // Request context if available
  const reqMethod = req?.method || null;
  const reqPath = req?.originalUrl || req?.url || null;
  const reqIp = req?.ip || req?.socket?.remoteAddress || null;
  const reqUser = req?.user?.username
    ? `${req.user.username} (${req.user.email || req.user.id})`
    : null;

  const subject = `🚨 [CRITICAL ALERT] ${source}: ${errorMessage.slice(0, 60)}`;

  const plainText = `[CRITICAL SERVER ALERT] ${source}

A critical error has occurred on EchoHub that requires attention:

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
        Automated alert generated by EchoHub Error Sentinel. You are receiving this because you are configured as the platform administrator (<code style="color: #8b949e;">${recipient}</code>).
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
  notifyCriticalError,
  sendTestNotification,
};

