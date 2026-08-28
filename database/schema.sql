-- Redis Caching Architecture — PostgreSQL 15+
-- Capstone 1: schema planning only. No application feature code.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    CONSTRAINT users_role_check CHECK (role IN ('user', 'manager', 'admin'))
);

CREATE TABLE cache_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_value JSONB NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 3600,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    hit_count BIGINT NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cache_entries_ttl_check CHECK (ttl >= 0),
    CONSTRAINT cache_entries_hit_count_check CHECK (hit_count >= 0),
    CONSTRAINT cache_entries_version_check CHECK (version > 0)
);

CREATE TABLE cache_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cache_entry_tags (
    cache_entry_id UUID NOT NULL REFERENCES cache_entries(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES cache_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (cache_entry_id, tag_id)
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cache_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255),
    operation VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    status VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cache_metrics_response_time_check CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    CONSTRAINT cache_metrics_operation_check CHECK (operation IN ('GET', 'POST', 'PUT', 'DELETE', 'SEARCH', 'STATS'))
);

-- Indexes are separate statements for valid PostgreSQL syntax.
CREATE INDEX idx_cache_entries_expires_at ON cache_entries (expires_at);
CREATE INDEX idx_cache_entries_created_by ON cache_entries (created_by);
CREATE INDEX idx_cache_entry_tags_tag_id ON cache_entry_tags (tag_id);
CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX idx_cache_metrics_cache_key ON cache_metrics (cache_key);
CREATE INDEX idx_cache_metrics_recorded_at ON cache_metrics (recorded_at);

CREATE VIEW cache_summary AS
SELECT
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) AS active_entries,
    COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) AS expired_entries,
    COALESCE(AVG(EXTRACT(EPOCH FROM (expires_at - created_at))), 0) AS avg_ttl_seconds,
    COALESCE(SUM(hit_count), 0) AS total_hits
FROM cache_entries;
