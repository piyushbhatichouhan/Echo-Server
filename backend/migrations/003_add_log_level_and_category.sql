-- Migration: Add level and category to deployment_logs for structured logging
ALTER TABLE deployment_logs ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'info';
ALTER TABLE deployment_logs ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'system';
CREATE INDEX IF NOT EXISTS idx_deployment_logs_category ON deployment_logs(category);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_level ON deployment_logs(level);
