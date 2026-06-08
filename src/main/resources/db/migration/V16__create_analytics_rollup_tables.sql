CREATE TABLE track_hourly_stats
(
    track_id         UUID                     NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    hour_timestamp   TIMESTAMP WITH TIME ZONE NOT NULL,
    plays            INT                      NOT NULL DEFAULT 0,
    skips            INT                      NOT NULL DEFAULT 0,
    unique_listeners INT                      NOT NULL DEFAULT 0,
    likes            INT                      NOT NULL DEFAULT 0,
    PRIMARY KEY (track_id, hour_timestamp)
);

CREATE INDEX idx_track_hourly_stats_time ON track_hourly_stats (hour_timestamp);

COMMENT ON TABLE track_hourly_stats IS 'Pre-calculated hourly aggregations for track telemetry. Populated asynchronously by ShedLock workers.';
COMMENT ON COLUMN track_hourly_stats.unique_listeners IS 'Count of distinct sessions/users who triggered a playback event within this hour.';
COMMENT ON COLUMN track_hourly_stats.skips IS 'Count of playbacks that did not reach the quality threshold (e.g., <30% completion).';

CREATE TABLE track_daily_stats
(
    track_id         UUID NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    date_timestamp   DATE NOT NULL,
    plays            INT  NOT NULL DEFAULT 0,
    skips            INT  NOT NULL DEFAULT 0,
    unique_listeners INT  NOT NULL DEFAULT 0,
    likes            INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (track_id, date_timestamp)
);

CREATE INDEX idx_track_daily_stats_date ON track_daily_stats (date_timestamp);

COMMENT ON TABLE track_daily_stats IS 'Pre-calculated daily aggregations for track telemetry. Rolled up nightly from track_hourly_stats for long-term retention.';

CREATE TABLE playlist_hourly_stats
(
    playlist_id      UUID                     NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    hour_timestamp   TIMESTAMP WITH TIME ZONE NOT NULL,
    plays            INT                      NOT NULL DEFAULT 0,
    skips            INT                      NOT NULL DEFAULT 0,
    unique_listeners INT                      NOT NULL DEFAULT 0,
    likes            INT                      NOT NULL DEFAULT 0,
    PRIMARY KEY (playlist_id, hour_timestamp)
);

CREATE INDEX idx_playlist_hourly_stats_time ON playlist_hourly_stats (hour_timestamp);

COMMENT ON TABLE playlist_hourly_stats IS 'Pre-calculated hourly aggregations for playlist telemetry. Tracks holistic playlist engagement.';

CREATE TABLE playlist_daily_stats
(
    playlist_id      UUID NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    date_timestamp   DATE NOT NULL,
    plays            INT  NOT NULL DEFAULT 0,
    skips            INT  NOT NULL DEFAULT 0,
    unique_listeners INT  NOT NULL DEFAULT 0,
    likes            INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (playlist_id, date_timestamp)
);

CREATE INDEX idx_playlist_daily_stats_date ON playlist_daily_stats (date_timestamp);

COMMENT ON TABLE playlist_daily_stats IS 'Pre-calculated daily aggregations for playlist telemetry. Rolled up nightly from playlist_hourly_stats.';