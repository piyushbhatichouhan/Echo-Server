-- Create http_analytics table for per-project and per-user traffic telemetry
CREATE TABLE IF NOT EXISTS http_analytics (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL,
    ip_hash VARCHAR(64),
    method VARCHAR(10) DEFAULT 'GET',
    path TEXT DEFAULT '/',
    bytes_sent BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analytics_proj_time ON http_analytics(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_time ON http_analytics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON http_analytics(timestamp DESC);
