-- 1. Expand status column to accommodate longer FSM state names
ALTER TABLE tracks
    ALTER COLUMN status TYPE VARCHAR(50);

-- 2. Create immutable audit log for State Machine transitions.
-- This table also acts as the staging area for AI proposals via the ai_payload column.
CREATE TABLE track_audit_logs
(
    id              UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    track_id        UUID                                               NOT NULL,
    actor_id        UUID,  -- Nullable to support System/AI-triggered transitions
    previous_status VARCHAR(50),
    new_status      VARCHAR(50)                                        NOT NULL,
    reason          TEXT,
    ai_payload      JSONB, -- Stores the raw AI JSON response/staging tags before artist approval
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_audit_track FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
);

-- Indexes for audit history retrieval and actor-based moderation queries
CREATE INDEX idx_track_audit_logs_track_id ON track_audit_logs (track_id);
CREATE INDEX idx_track_audit_logs_actor_id ON track_audit_logs (actor_id);