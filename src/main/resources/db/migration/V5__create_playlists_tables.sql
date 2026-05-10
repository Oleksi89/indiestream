CREATE TABLE playlists
(
    id                     UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
    owner_id               UUID         NOT NULL,
    name                   VARCHAR(255) NOT NULL,
    description            TEXT,
    cover_minio_path       VARCHAR(512),
    is_public              BOOLEAN      NOT NULL    DEFAULT true,
    is_system              BOOLEAN      NOT NULL    DEFAULT false,
    is_collaborative       BOOLEAN      NOT NULL    DEFAULT false,
    track_count            INTEGER      NOT NULL    DEFAULT 0,
    total_duration_seconds INTEGER      NOT NULL    DEFAULT 0,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_playlists_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_playlists_owner_id ON playlists (owner_id);
CREATE INDEX idx_playlists_is_public ON playlists (is_public);

CREATE TABLE playlist_tracks
(
    playlist_id    UUID    NOT NULL,
    track_id       UUID    NOT NULL,
    added_by_id    UUID    NOT NULL,
    added_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    position_index INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id),
    CONSTRAINT fk_pt_playlist FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_track FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_added_by FOREIGN KEY (added_by_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_tracks_position ON playlist_tracks (playlist_id, position_index);

CREATE TABLE playlist_collaborators
(
    playlist_id UUID NOT NULL,
    user_id     UUID NOT NULL,
    joined_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, user_id),
    CONSTRAINT fk_pc_playlist FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
    CONSTRAINT fk_pc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE playlist_followers
(
    user_id     UUID NOT NULL,
    playlist_id UUID NOT NULL,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, playlist_id),
    CONSTRAINT fk_pf_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_pf_playlist FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
);