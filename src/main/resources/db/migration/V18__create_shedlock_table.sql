-- Creates the distributed lock table used by ShedLock to prevent concurrent execution
-- of time-series aggregation cron jobs across multiple backend instances.
CREATE TABLE shedlock
(
    name       VARCHAR(64)              NOT NULL,
    lock_until TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_by  VARCHAR(255)             NOT NULL,
    PRIMARY KEY (name)
);

COMMENT ON TABLE shedlock IS 'Standard table for ShedLock. Coordinates distributed cron execution.';