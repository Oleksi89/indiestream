-- Add fields to support the Human-in-the-Loop (HITL) moderation workflow
ALTER TABLE tracks
    ADD COLUMN has_appealed         BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN artist_proposed_tags JSONB;