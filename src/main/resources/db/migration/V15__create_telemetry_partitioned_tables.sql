CREATE TABLE raw_playback_logs
(
    event_id             UUID                     NOT NULL,
    user_id              UUID,
    track_id             UUID                     NOT NULL,
    session_id           UUID                     NOT NULL,
    start_position_ms    INT                      NOT NULL,
    end_position_ms      INT                      NOT NULL,
    playback_duration_ms INT                      NOT NULL,
    client_ip            VARCHAR(45),
    user_agent           TEXT,
    is_suspected_bot     BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (event_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_raw_playback_track_id_created_at ON raw_playback_logs (track_id, created_at);
CREATE INDEX idx_raw_playback_session_id ON raw_playback_logs (session_id);
CREATE INDEX idx_raw_playback_user_id ON raw_playback_logs (user_id);

COMMENT ON TABLE raw_playback_logs IS 'Raw high-throughput time-series logs for track playbacks. Partitioned monthly by created_at.';
COMMENT ON COLUMN raw_playback_logs.event_id IS 'Unique identifier for the telemetry event. Combined with created_at to satisfy partitioning constraints.';
COMMENT ON COLUMN raw_playback_logs.is_suspected_bot IS 'Flag evaluated by the anti-fraud engine to isolate streaming farm patterns from authentic organic traffic.';

CREATE TABLE raw_interaction_logs
(
    event_id         UUID                     NOT NULL,
    user_id          UUID,
    target_id        UUID                     NOT NULL,
    interaction_type VARCHAR(50)              NOT NULL,
    source_type      VARCHAR(50)              NOT NULL,
    ui_surface       VARCHAR(50)              NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (event_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_raw_interaction_target_id_created_at ON raw_interaction_logs (target_id, created_at);
CREATE INDEX idx_raw_interaction_user_id ON raw_interaction_logs (user_id);

COMMENT ON TABLE raw_interaction_logs IS 'Raw high-throughput logs for user interaction events (likes, playlist additions, follows). Partitioned monthly.';
COMMENT ON COLUMN raw_interaction_logs.target_id IS 'The UUID of the entity being interacted with (e.g., track_id, playlist_id, artist_id).';

DO
$$
    DECLARE
        current_month_start      DATE := date_trunc('month', CURRENT_DATE);
        next_month_start         DATE := current_month_start + INTERVAL '1 month';
        month_after_next_start   DATE := next_month_start + INTERVAL '1 month';
        playback_current_name    TEXT := 'raw_playback_logs_' || to_char(current_month_start, 'YYYY_MM');
        playback_next_name       TEXT := 'raw_playback_logs_' || to_char(next_month_start, 'YYYY_MM');
        interaction_current_name TEXT := 'raw_interaction_logs_' || to_char(current_month_start, 'YYYY_MM');
        interaction_next_name    TEXT := 'raw_interaction_logs_' || to_char(next_month_start, 'YYYY_MM');
    BEGIN
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF raw_playback_logs FOR VALUES FROM (%L) TO (%L)',
                       playback_current_name, current_month_start, next_month_start);

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF raw_playback_logs FOR VALUES FROM (%L) TO (%L)',
                       playback_next_name, next_month_start, month_after_next_start);

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF raw_interaction_logs FOR VALUES FROM (%L) TO (%L)',
                       interaction_current_name, current_month_start, next_month_start);

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF raw_interaction_logs FOR VALUES FROM (%L) TO (%L)',
                       interaction_next_name, next_month_start, month_after_next_start);

        CREATE TABLE IF NOT EXISTS raw_playback_logs_default PARTITION OF raw_playback_logs DEFAULT;
        CREATE TABLE IF NOT EXISTS raw_interaction_logs_default PARTITION OF raw_interaction_logs DEFAULT;
    END
$$;