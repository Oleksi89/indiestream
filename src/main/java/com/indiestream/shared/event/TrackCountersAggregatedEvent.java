package com.indiestream.shared.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Shared Domain Event. Moved to the Shared Kernel to break the cyclic dependency
 * between the Telemetry and Media modules.
 */
public record TrackCountersAggregatedEvent(
        UUID trackId,
        OffsetDateTime hourTimestamp,
        int newPlays,
        int newSkips,
        int newLikes,
        double vectorWeight,
        String idempotencyKey
) {
    public TrackCountersAggregatedEvent(UUID trackId, OffsetDateTime hourTimestamp, int newPlays, int newSkips, int newLikes) {
        this(
                trackId,
                hourTimestamp,
                newPlays,
                newSkips,
                newLikes,
                (newPlays * 1.0) + (newLikes * 2.0) - (newSkips * 0.5),
                "track-stat-" + trackId + "-" + hourTimestamp.toString()
        );
    }
}