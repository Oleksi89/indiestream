ALTER TABLE tracks
    ADD COLUMN popularity_score DOUBLE PRECISION DEFAULT 0.0 NOT NULL;

CREATE INDEX idx_tracks_popularity ON tracks (popularity_score DESC);