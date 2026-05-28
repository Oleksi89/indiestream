ALTER TABLE playlists
    ADD COLUMN followers_count INTEGER NOT NULL DEFAULT 0;

-- Backfill existing counts safely
UPDATE playlists p
SET followers_count = (SELECT COUNT(*)
                       FROM playlist_followers pf
                       WHERE pf.playlist_id = p.id);