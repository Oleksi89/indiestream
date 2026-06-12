-- Daily Pre-aggregation for Demographics, Sources
-- Reduces CPU load by preventing full scans of raw_playback_logs for ALL_TIME ranges.

CREATE TABLE track_daily_demographics
(
    track_id       UUID       NOT NULL,
    date_timestamp DATE       NOT NULL,
    client_country VARCHAR(2) NOT NULL,
    listeners      BIGINT DEFAULT 0,
    PRIMARY KEY (track_id, date_timestamp, client_country)
);

CREATE TABLE track_daily_sources
(
    track_id       UUID        NOT NULL,
    date_timestamp DATE        NOT NULL,
    source_type    VARCHAR(50) NOT NULL,
    plays          BIGINT DEFAULT 0,
    PRIMARY KEY (track_id, date_timestamp, source_type)
);