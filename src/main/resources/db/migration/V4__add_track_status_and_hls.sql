ALTER TABLE tracks
    ADD COLUMN status VARCHAR(20) DEFAULT 'PROCESSING' NOT NULL;
ALTER TABLE tracks
    ADD COLUMN hls_manifest_path VARCHAR(255);

-- Performance: Index for public feed filtering
CREATE INDEX idx_tracks_status_created ON tracks (status, created_at DESC);

UPDATE tracks
SET status = 'READY';