-- Migration: Add broadcast_emails table for tracking Super Admin email broadcasts
CREATE TABLE IF NOT EXISTS broadcast_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    audience_type VARCHAR(30) NOT NULL, -- 'all', 'privileged', 'individual'
    recipient_count INT NOT NULL DEFAULT 0,
    recipients_summary TEXT,
    subject VARCHAR(255) NOT NULL,
    template_key VARCHAR(50) DEFAULT 'custom',
    badge_text VARCHAR(50),
    body_text TEXT NOT NULL,
    cta_label VARCHAR(100),
    cta_url TEXT,
    success_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_emails_created_at ON broadcast_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_emails_sender ON broadcast_emails(sender_id);

