-- Enriches playback logs with origin context to calculate precise vector weights for AI recommendations.

ALTER TABLE raw_playback_logs
    ADD COLUMN source_type VARCHAR(50);

ALTER TABLE raw_playback_logs
    ADD COLUMN source_id UUID;

COMMENT ON COLUMN raw_playback_logs.source_type IS 'Origin of playback (e.g., PLAYLIST, SEARCH, ALBUM). Used for AI weighting.';
COMMENT ON COLUMN raw_playback_logs.source_id IS 'Optional UUID of the origin container (e.g., specific Playlist ID).';