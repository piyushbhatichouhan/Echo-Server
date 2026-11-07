const { pool } = require("../config/database");

/**
 * Creates a record of an email broadcast.
 */
const createBroadcastRecord = async ({
  senderId,
  audienceType,
  recipientCount = 0,
  recipientsSummary = "",
  subject,
  templateKey = "custom",
  badgeText = null,
  bodyText,
  ctaLabel = null,
  ctaUrl = null,
  successCount = 0,
  failureCount = 0,
}) => {
  const { rows } = await pool.query(
    `
    INSERT INTO broadcast_emails (
      sender_id,
      audience_type,
      recipient_count,
      recipients_summary,
      subject,
      template_key,
      badge_text,
      body_text,
      cta_label,
      cta_url,
      success_count,
      failure_count,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    RETURNING *
    `,
    [
      senderId,
      audienceType,
      recipientCount,
      recipientsSummary,
      subject,
      templateKey,
      badgeText,
      bodyText,
      ctaLabel,
      ctaUrl,
      successCount,
      failureCount,
    ],
  );

  return rows[0];
};

/**
 * Updates broadcast completion stats.
 */
const updateBroadcastStats = async (id, { successCount, failureCount }) => {
  const { rows } = await pool.query(
    `
    UPDATE broadcast_emails
    SET success_count = $2, failure_count = $3
    WHERE id = $1
    RETURNING *
    `,
    [id, successCount, failureCount],
  );
  return rows[0];
};

/**
 * Retrieves broadcast email audit history.
 */
const getBroadcastHistory = async (limit = 50) => {
  const { rows } = await pool.query(
    `
    SELECT
      b.*,
      u.username AS sender_username,
      u.email AS sender_email
    FROM broadcast_emails b
    LEFT JOIN users u ON u.id = b.sender_id
    ORDER BY b.created_at DESC
    LIMIT $1
    `,
    [limit],
  );

  return rows;
};

/**
 * Queries users eligible to receive emails based on audience selection.
 */
const getAudienceUsers = async (audienceType, userIds = []) => {
  if (audienceType === "individual") {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }
    const { rows } = await pool.query(
      `
      SELECT id, username, email, is_owner, can_custom_subdomain, created_at
      FROM users
      WHERE id = ANY($1::uuid[])
        AND disabled = FALSE
        AND pending_deletion = FALSE
        AND email IS NOT NULL
        AND TRIM(email) != ''
      ORDER BY username ASC
      `,
      [userIds],
    );
    return rows;
  }

  if (audienceType === "privileged") {
    const { rows } = await pool.query(
      `
      SELECT id, username, email, is_owner, can_custom_subdomain, created_at
      FROM users
      WHERE (can_custom_subdomain = TRUE OR is_owner = TRUE)
        AND disabled = FALSE
        AND pending_deletion = FALSE
        AND email IS NOT NULL
        AND TRIM(email) != ''
      ORDER BY username ASC
      `,
    );
    return rows;
  }

  // Default: 'all'
  const { rows } = await pool.query(
    `
    SELECT id, username, email, is_owner, can_custom_subdomain, created_at
    FROM users
    WHERE disabled = FALSE
      AND pending_deletion = FALSE
      AND email IS NOT NULL
      AND TRIM(email) != ''
    ORDER BY username ASC
    `,
  );
  return rows;
};

/**
 * Retrieves live counts for each audience group.
 */
const getAudienceCounts = async () => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE disabled = FALSE AND pending_deletion = FALSE AND email IS NOT NULL AND TRIM(email) != '') AS all_count,
      COUNT(*) FILTER (WHERE (can_custom_subdomain = TRUE OR is_owner = TRUE) AND disabled = FALSE AND pending_deletion = FALSE AND email IS NOT NULL AND TRIM(email) != '') AS privileged_count
    FROM users
  `);

  return {
    all: Number(rows[0]?.all_count || 0),
    privileged: Number(rows[0]?.privileged_count || 0),
  };
};

module.exports = {
  createBroadcastRecord,
  updateBroadcastStats,
  getBroadcastHistory,
  getAudienceUsers,
  getAudienceCounts,
};

