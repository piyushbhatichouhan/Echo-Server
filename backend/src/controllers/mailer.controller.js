const mailerService = require("../services/mailer.service");

const getTemplates = async (req, res, next) => {
  try {
    const templates = mailerService.getTemplates();
    res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
};

const getRecipients = async (req, res, next) => {
  try {
    const { audienceType, userIds } = req.query;
    const parsedUserIds = userIds ? String(userIds).split(",").filter(Boolean) : [];
    const data = await mailerService.getRecipientsData(audienceType || "all", parsedUserIds);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const previewEmail = async (req, res, next) => {
  try {
    const { subject, badge, badgeType, body, ctaLabel, ctaUrl } = req.body || {};
    const sampleUser = {
      username: req.user?.username || "Developer",
      email: req.user?.email || "developer@example.com",
    };
    const rendered = mailerService.renderEmail({
      subject: subject || "Platform Notification",
      badge: badge || "ANNOUNCEMENT",
      badgeType: badgeType || "info",
      body: body || "Your message body content...",
      ctaLabel,
      ctaUrl,
      user: sampleUser,
    });
    res.json({
      success: true,
      data: rendered,
    });
  } catch (err) {
    next(err);
  }
};

const sendTestEmail = async (req, res, next) => {
  try {
    const { draft } = req.body || {};
    if (!draft) {
      return res.status(400).json({ success: false, message: "Draft content is required." });
    }
    const result = await mailerService.sendTestEmail({
      adminUser: req.user,
      draft,
    });
    res.json({
      success: true,
      message: `Test email sent successfully to ${result.recipient}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const sendBroadcast = async (req, res, next) => {
  try {
    const { audienceType, individualUserIds, draft } = req.body || {};
    if (!draft) {
      return res.status(400).json({ success: false, message: "Draft content is required." });
    }
    const result = await mailerService.sendBroadcast({
      adminUser: req.user,
      audienceType,
      individualUserIds,
      draft,
    });
    res.json({
      success: true,
      message: `Broadcast successfully dispatched to ${result.sent}/${result.total} recipient(s).`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const history = await mailerService.getBroadcastHistory(limit);
    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTemplates,
  getRecipients,
  previewEmail,
  sendTestEmail,
  sendBroadcast,
  getHistory,
};

