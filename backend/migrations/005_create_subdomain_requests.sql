-- Migration: Add subdomain_requests table for Super Admin approval workflow
CREATE TABLE IF NOT EXISTS subdomain_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subdomain VARCHAR(63) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subdomain_requests_project ON subdomain_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_subdomain_requests_user ON subdomain_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_subdomain_requests_status ON subdomain_requests(status);
CREATE INDEX IF NOT EXISTS idx_subdomain_requests_subdomain ON subdomain_requests(subdomain);

