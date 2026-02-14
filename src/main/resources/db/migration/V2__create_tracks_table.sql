CREATE TABLE tracks
(
    id                UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    artist_id         UUID         NOT NULL,
    title             VARCHAR(255) NOT NULL,
    -- base path or object identifier in MinIO
    minio_bucket_path VARCHAR(512) NOT NULL,
    -- JSONB for flexible configuration of STEM files
    stems_metadata    JSONB        NOT NULL    DEFAULT '{}'::jsonb,
    duration_seconds  INTEGER,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tracks_artist FOREIGN KEY (artist_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_tracks_artist_id ON tracks (artist_id);

-- GIN (Generalized Inverted Index) for efficient key search within JSONB
-- TODO: [Analytics] - Evaluate query performance if searching tracks by specific stem presence becomes a frequent operation.
CREATE INDEX idx_tracks_stems_metadata ON tracks USING GIN (stems_metadata);
