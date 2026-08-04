CREATE TABLE project_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    hostname VARCHAR(255) NOT NULL UNIQUE,

    custom_domain VARCHAR(255),

    is_custom BOOLEAN NOT NULL DEFAULT FALSE,

    is_primary BOOLEAN NOT NULL DEFAULT TRUE,

    ssl_status VARCHAR(20) NOT NULL DEFAULT 'pending',

    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_domains_project
ON project_domains(project_id);