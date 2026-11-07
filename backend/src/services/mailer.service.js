const mailerRepository = require("../repositories/mailer.repository");
const { sendMail } = require("./mail.service");
const { getAdminRecipient } = require("./notification.service");

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
// Standard Pre-Configured Templates
// -------------------------------------------------------------
const TEMPLATES = [
  {
    key: "server_maintenance",
    name: "Server Maintenance Notice",
    description: "Alert users of scheduled platform upgrades, expected downtime, and impacted services.",
    category: "Operations",
    icon: "Wrench",
    badge: "SCHEDULED MAINTENANCE",
    badgeType: "warning",
    subject: "🛠️ Scheduled System Maintenance Notice: EchoHub Platform",
    body: `Dear {{username}},

Please be advised that the EchoHub platform will be undergoing scheduled infrastructure maintenance to apply system optimizations, security patches, and performance enhancements.

• Maintenance Window: Saturday, 11:00 PM – 01:00 AM IST
• Expected Downtime: Approximately 15 to 30 minutes
• Impacted Services: Developer Dashboard, API gateways, and deployment queues

Existing web workloads running on reverse proxies may experience brief intermittent connectivity during this period. We recommend saving all active workspace work and avoiding new deployments right before the window begins.

We appreciate your patience and understanding as we continuously improve platform stability.`,
    ctaLabel: "Check System Health",
    ctaUrl: "{{frontendUrl}}/server/health",
  },
  {
    key: "security_advisory",
    name: "Security Advisory / Action Required",
    description: "Inform developers of security hardening, recommended password updates, or credential reviews.",
    category: "Security",
    icon: "ShieldAlert",
    badge: "SECURITY ADVISORY",
    badgeType: "danger",
    subject: "🔒 Important Security Update & Recommended Actions",
    body: `Dear {{username}},

As part of our commitment to platform safety, we have deployed critical security enhancements across EchoHub, including database-level AES-256 secret encryption at rest and strict token verification.

To ensure your projects and account remain safe, we recommend the following security hygiene steps:
• Review your environment variables and sensitive API tokens in Project Settings
• Verify that your registered account email is active and current
• If you haven't changed your password recently, consider updating it now

If you notice any unusual activity, please reach out to the platform administration immediately.`,
    ctaLabel: "Review Account Settings",
    ctaUrl: "{{frontendUrl}}/settings",
  },
  {
    key: "platform_update",
    name: "Platform Update & Feature Release",
    description: "Announce new capabilities like Blue-Green deployments, real HTTP analytics, and custom subdomains.",
    category: "Announcements",
    icon: "Sparkles",
    badge: "PLATFORM UPDATE",
    badgeType: "success",
    subject: "🚀 What's New on EchoHub: Zero-Downtime Deployments & Analytics",
    body: `Hello {{username}},

We are thrilled to announce several major enhancements newly released on the EchoHub platform:

✨ Zero-Downtime Blue-Green Deployments: Update your applications seamlessly without offline hiccups. Your existing container serves visitors until the new version passes all health probes.
📊 Real HTTP Traffic Analytics: Monitor real visitor counts, request volume, latency, status codes, and bandwidth live from your project analytics tab.
🌐 Instant Custom Subdomains: Choose unique custom subdomains on devpiyush.in with automated Nginx reverse proxy routing and SSL.
🔐 AES-256 Secret Encryption: Database secrets and sensitive environment keys are now encrypted with military-grade encryption at rest.

Log in to your workspace today to experience the upgrades!`,
    ctaLabel: "Open Developer Dashboard",
    ctaUrl: "{{frontendUrl}}/dashboard",
  },
  {
    key: "subdomain_guidelines",
    name: "Custom Subdomain Policy & Guidelines",
    description: "Clarify community rules, naming guidelines, and reserved names for custom subdomains.",
    category: "Policy",
    icon: "Globe",
    badge: "DOMAIN GUIDELINES",
    badgeType: "info",
    subject: "🌐 Important Update: Custom Subdomains & Routing Guidelines",
    body: `Hello {{username}},

This notice provides important guidelines regarding custom subdomains on devpiyush.in.

Eligible developers can select custom subdomains for their hosted web projects. Please ensure that chosen subdomains adhere to our naming policy:
• Subdomains must consist only of lowercase alphanumeric characters and hyphens
• Impersonation of core platform services, brand names, or trademarks is prohibited
• Subdomains found in violation of policy will be administratively revoked and automatically reverted to standard format

Thank you for building with EchoHub!`,
    ctaLabel: "View Your Projects",
    ctaUrl: "{{frontendUrl}}/projects",
  },
  {
    key: "storage_cleanup",
    name: "Storage & Resource Quota Advisory",
    description: "Remind developers to clean up unused containers, prune old build artifacts, and review quotas.",
    category: "Resources",
    icon: "HardDrive",
    badge: "RESOURCE USAGE",
    badgeType: "warning",
    subject: "💾 Resource Quota & Workspace Storage Advisory",
    body: `Hello {{username}},

To ensure high availability and fast build performance for all platform developers, we encourage you to perform periodic maintenance on your projects:

• Inspect and remove orphaned deployment containers or outdated project branches
• Clear temporary build caches and unnecessary stored assets
• Check your storage usage tab in the dashboard to ensure you remain comfortably within your limits

Keeping your workspaces optimized guarantees faster deployment pipelines and peak container performance.`,
    ctaLabel: "Manage Project Storage",
    ctaUrl: "{{frontendUrl}}/server/storage",
  },
  {
    key: "custom_announcement",
    name: "Custom Announcement (Blank)",
    description: "Start from a blank canvas with a professional branded EchoHub layout.",
    category: "General",
    icon: "Send",
    badge: "ANNOUNCEMENT",
    badgeType: "info",
    subject: "📢 Important Notice from EchoHub Administration",
    body: `Hello {{username}},

We are writing to share an important announcement regarding your EchoHub account and hosted services.

[Enter your custom message here]

If you have any questions or require assistance, please feel free to reach out to our team.`,
    ctaLabel: "Open EchoHub",
    ctaUrl: "{{frontendUrl}}",
  },
];

/**
 * Returns available templates.
 */
const getTemplates = () => {
  return TEMPLATES;
};

// -------------------------------------------------------------
// Dynamic Interpolation & HTML Builder
// -------------------------------------------------------------
const interpolate = (text, user = {}) => {
  if (!text) return "";
  const frontendUrl = getFrontendUrl();
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return text
    .replace(/\{\{\s*username\s*\}\}/gi, user.username || "Developer")
    .replace(/\{\{\s*email\s*\}\}/gi, user.email || "developer@example.com")
    .replace(/\{\{\s*frontendUrl\s*\}\}/gi, frontendUrl)
    .replace(/\{\{\s*date\s*\}\}/gi, dateStr);
};

const getBadgeStyles = (badgeType = "info") => {
  switch (badgeType?.toLowerCase()) {
    case "warning":
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.35)",
        color: "#fbbf24",
      };
    case "danger":
      return {
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.35)",
        color: "#f87171",
      };
    case "success":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.35)",
        color: "#34d399",
      };
    case "info":
    default:
      return {
        bg: "rgba(56, 189, 248, 0.12)",
        border: "rgba(56, 189, 248, 0.35)",
        color: "#38bdf8",
      };
  }
};

/**
 * Formats body text into clean responsive HTML.
 */
const formatBodyToHtml = (rawText) => {
  if (!rawText) return "";

  const lines = rawText.split("\n");
  let html = "";
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Empty line
    if (!line) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }

    // Bullet line
    if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += '<ul style="margin: 16px 0; padding-left: 20px; color: #c9d1d9; font-size: 15px; line-height: 1.6;">';
        inList = true;
      }
      const itemContent = line.replace(/^[•\-*]\s+/, "");
      html += `<li style="margin-bottom: 8px;">${parseInlineMarkdown(itemContent)}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    html += `<p style="margin: 0 0 16px; color: #c9d1d9; font-size: 15px; line-height: 1.6;">${parseInlineMarkdown(line)}</p>`;
  }

  if (inList) {
    html += "</ul>";
  }

  return html;
};

const parseInlineMarkdown = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f0f6fc;">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(110, 118, 129, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>');
};

/**
 * Renders complete HTML email wrapper.
 */
const renderEmail = ({
  subject,
  badge = "ANNOUNCEMENT",
  badgeType = "info",
  body,
  ctaLabel = null,
  ctaUrl = null,
  user = {},
}) => {
  const interpolatedSubject = interpolate(subject, user);
  const interpolatedBadge = interpolate(badge, user);
  const interpolatedBody = interpolate(body, user);
  const interpolatedCtaLabel = interpolate(ctaLabel, user);
  const interpolatedCtaUrl = interpolate(ctaUrl, user);

  const badgeStyle = getBadgeStyles(badgeType);
  const bodyHtml = formatBodyToHtml(interpolatedBody);

  const ctaButtonHtml =
    interpolatedCtaLabel && interpolatedCtaUrl
      ? `
      <div style="margin: 32px 0 16px;">
        <a
          href="${interpolatedCtaUrl}"
          style="
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            padding: 13px 26px;
            text-decoration: none;
            border-radius: 10px;
            display: inline-block;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
          "
        >
          ${interpolatedCtaLabel} →
        </a>
      </div>
      `
      : "";

  const html = `
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        padding: 36px 28px;
        background: #0d1117;
        color: #f0f6fc;
        border-radius: 16px;
        border: 1px solid #283042;
    ">
      <div style="border-bottom: 1px solid #21262d; padding-bottom: 22px; margin-bottom: 26px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${badgeStyle.color}; background: ${badgeStyle.bg}; padding: 5px 12px; border-radius: 999px; border: 1px solid ${badgeStyle.border};">
            ${interpolatedBadge}
          </span>
          <span style="color: #6e7681; font-size: 12px; font-family: monospace;">EchoHub Platform</span>
        </div>
        <h1 style="color: #f0f6fc; margin: 0; font-size: 22px; font-weight: 700; line-height: 1.35;">
          ${interpolatedSubject}
        </h1>
      </div>

      <div style="margin-bottom: 24px;">
        ${bodyHtml}
      </div>

      ${ctaButtonHtml}

      <div style="border-top: 1px solid #21262d; padding-top: 20px; margin-top: 32px; color: #6e7681; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 6px;">
          This official platform broadcast was dispatched by EchoHub Administration.
        </p>
        <p style="margin: 0;">
          Delivered to registered developer account: <strong style="color: #8b949e;">${user.email || "developer@example.com"}</strong>
        </p>
      </div>
    </div>
  `;

  const plainText = `[EchoHub Platform Broadcast]
${interpolatedBadge}
${interpolatedSubject}

${interpolatedBody}

${interpolatedCtaLabel && interpolatedCtaUrl ? `\n${interpolatedCtaLabel}: ${interpolatedCtaUrl}\n` : ""}

---
This official platform broadcast was dispatched by EchoHub Administration.
Delivered to: ${user.email || "developer@example.com"}
`;

  return {
    subject: interpolatedSubject,
    badge: interpolatedBadge,
    html,
    plainText,
  };
};

// -------------------------------------------------------------
// Audience and Recipient Resolution
// -------------------------------------------------------------
const getRecipientsData = async (audienceType = "all", individualUserIds = []) => {
  const users = await mailerRepository.getAudienceUsers(audienceType, individualUserIds);
  const counts = await mailerRepository.getAudienceCounts();

  return {
    users,
    count: users.length,
    counts,
  };
};

// -------------------------------------------------------------
// Dispatch Methods
// -------------------------------------------------------------

/**
 * Sends a single test email of the draft to the Super Admin's email address.
 */
const sendTestEmail = async ({ adminUser, draft }) => {
  const recipientEmail = adminUser?.email || getAdminRecipient();
  const sampleUser = {
    username: adminUser?.username || "SuperAdmin",
    email: recipientEmail,
  };

  const rendered = renderEmail({
    subject: `[TEST] ${draft.subject || "Platform Notice"}`,
    badge: draft.badge || "TEST PREVIEW",
    badgeType: draft.badgeType || "info",
    body: draft.body || "This is a test notification preview.",
    ctaLabel: draft.ctaLabel,
    ctaUrl: draft.ctaUrl,
    user: sampleUser,
  });

  const info = await sendMail({
    to: recipientEmail,
    subject: rendered.subject,
    text: rendered.plainText,
    html: rendered.html,
  });

  return {
    ok: true,
    recipient: recipientEmail,
    messageId: info?.messageId,
  };
};

/**
 * Broadcasts an email to the selected audience with chunked rate limiting.
 */
const sendBroadcast = async ({
  adminUser,
  audienceType = "all",
  individualUserIds = [],
  draft = {},
}) => {
  if (!draft.subject?.trim()) {
    const err = new Error("Email subject is required.");
    err.status = 400;
    throw err;
  }
  if (!draft.body?.trim()) {
    const err = new Error("Email body content is required.");
    err.status = 400;
    throw err;
  }

  // 1. Resolve recipients
  const recipients = await mailerRepository.getAudienceUsers(audienceType, individualUserIds);

  if (recipients.length === 0) {
    const err = new Error("No eligible recipient email addresses found for the selected audience.");
    err.status = 400;
    throw err;
  }

  const recipientsSummary =
    audienceType === "individual"
      ? `${recipients.length} individual user(s): ${recipients.slice(0, 3).map((u) => u.username).join(", ")}${recipients.length > 3 ? "..." : ""}`
      : `${audienceType.toUpperCase()} Users (${recipients.length})`;

  // 2. Create audit record
  const broadcastRecord = await mailerRepository.createBroadcastRecord({
    senderId: adminUser?.id || null,
    audienceType,
    recipientCount: recipients.length,
    recipientsSummary,
    subject: draft.subject.trim(),
    templateKey: draft.templateKey || "custom",
    badgeText: draft.badge?.trim() || "ANNOUNCEMENT",
    bodyText: draft.body.trim(),
    ctaLabel: draft.ctaLabel?.trim() || null,
    ctaUrl: draft.ctaUrl?.trim() || null,
    successCount: 0,
    failureCount: 0,
  });

  // 3. Chunked delivery (5 users per batch, 250ms gap between batches)
  const CHUNK_SIZE = 5;
  const DELAY_MS = 250;
  let successCount = 0;
  let failureCount = 0;
  const failedRecipients = [];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (user) => {
        try {
          const rendered = renderEmail({
            subject: draft.subject.trim(),
            badge: draft.badge?.trim() || "ANNOUNCEMENT",
            badgeType: draft.badgeType || "info",
            body: draft.body.trim(),
            ctaLabel: draft.ctaLabel?.trim() || null,
            ctaUrl: draft.ctaUrl?.trim() || null,
            user,
          });

          await sendMail({
            to: user.email,
            subject: rendered.subject,
            text: rendered.plainText,
            html: rendered.html,
          });
          successCount++;
        } catch (err) {
          console.error(`[Mailer] Failed sending to ${user.email}:`, err.message);
          failureCount++;
          failedRecipients.push({ email: user.email, error: err.message });
        }
      }),
    );

    if (i + CHUNK_SIZE < recipients.length) {
      await sleep(DELAY_MS);
    }
  }

  // 4. Update broadcast stats
  await mailerRepository.updateBroadcastStats(broadcastRecord.id, {
    successCount,
    failureCount,
  });

  console.log(
    `[Mailer] Broadcast completed (ID: ${broadcastRecord.id}). Total: ${recipients.length}, Success: ${successCount}, Failures: ${failureCount}`,
  );

  return {
    success: true,
    broadcastId: broadcastRecord.id,
    total: recipients.length,
    sent: successCount,
    failed: failureCount,
    failedRecipients,
    summary: recipientsSummary,
  };
};

/**
 * Returns past broadcast history.
 */
const getBroadcastHistory = async (limit = 50) => {
  return await mailerRepository.getBroadcastHistory(limit);
};

module.exports = {
  getTemplates,
  renderEmail,
  getRecipientsData,
  sendTestEmail,
  sendBroadcast,
  getBroadcastHistory,
};

