ALTER TABLE tracks
    ADD COLUMN genre VARCHAR(100),
    ADD COLUMN is_explicit BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN tags JSONB DEFAULT '{}'::jsonb NOT NULL;

-- GIN (Generalized Inverted Index) for O(1) performance on nested array searches.
-- Critical for the upcoming AI Discovery Engine to query custom and ai_generated tags.
CREATE INDEX idx_tracks_tags ON tracks USING GIN (tags);