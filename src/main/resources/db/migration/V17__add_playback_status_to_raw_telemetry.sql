-- Adds the computed playback status to raw logs to support data warehouse auditing
-- and prevent data loss of the anti-fraud evaluation results.
ALTER TABLE raw_playback_logs
    ADD COLUMN playback_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN';

COMMENT ON COLUMN raw_playback_logs.playback_status IS 'Evaluated status of the playback: SKIP, PARTIAL, or FULL.';