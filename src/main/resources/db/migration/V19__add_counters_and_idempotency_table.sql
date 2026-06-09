ALTER TABLE tracks
    ADD COLUMN play_count INT NOT NULL DEFAULT 0;
ALTER TABLE tracks
    ADD COLUMN skip_count INT NOT NULL DEFAULT 0;
ALTER TABLE tracks
    ADD COLUMN like_count INT NOT NULL DEFAULT 0;

ALTER TABLE playlists
    ADD COLUMN like_count INT NOT NULL DEFAULT 0;

CREATE TABLE processed_telemetry_events
(
    idempotency_key VARCHAR(255)             NOT NULL,
    processed_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (idempotency_key)
);

COMMENT ON TABLE processed_telemetry_events IS 'De-duplication log for telemetry domain events to guarantee exactly-once processing processing behavior.';