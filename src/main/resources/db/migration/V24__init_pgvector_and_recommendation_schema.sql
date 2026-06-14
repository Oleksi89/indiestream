-- Initialize the pgvector extension for high-performance semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Static Embeddings for Tracks (Generated once upon creation)
-- 768 dimensions strictly matches OpenAI's text-embedding-3-small output
ALTER TABLE tracks
    ADD COLUMN vector vector(768);

-- Create an HNSW index for O(log n) cosine distance similarity searches
-- vector_cosine_ops is the mandatory operator class for the <=> distance function
CREATE INDEX idx_tracks_vector_hnsw ON tracks USING hnsw (vector vector_cosine_ops);

-- 2. Dynamic Embeddings for Users (Taste Vector, updated via EMA)
-- Default is NULL, representing the "Cold Start" state requiring Onboarding
ALTER TABLE user_profiles
    ADD COLUMN taste_vector vector(768);

-- 3. Dynamic Embeddings for Playlists (Centroid Vector, mathematical average of tracks)
ALTER TABLE playlists
    ADD COLUMN centroid_vector vector(768);

-- 4. User Blacklists (Negative Taste Tracking & "Not Interested" feature)
CREATE TABLE user_blacklists
(
    user_id    UUID                                               NOT NULL,
    track_id   UUID                                               NOT NULL,
    reason     VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT pk_user_blacklists PRIMARY KEY (user_id, track_id),
    CONSTRAINT fk_user_blacklists_user FOREIGN KEY (user_id) REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_blacklists_track FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
);

-- Optimize reverse lookups for the recommendation engine's anti-join filter
CREATE INDEX idx_user_blacklists_user_id ON user_blacklists (user_id);