package com.indiestream.shared.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PlaylistCountersAggregatedEvent(
        UUID playlistId,
        OffsetDateTime hourTimestamp,
        int newLikes,
        String idempotencyKey
) {
    public PlaylistCountersAggregatedEvent(UUID playlistId, OffsetDateTime hourTimestamp, int newLikes) {
        this(
                playlistId,
                hourTimestamp,
                newLikes,
                "playlist-stat-" + playlistId + "-" + hourTimestamp.toString()
        );
    }
}