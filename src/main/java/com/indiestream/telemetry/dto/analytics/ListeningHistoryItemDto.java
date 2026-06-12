package com.indiestream.telemetry.dto.analytics;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ListeningHistoryItemDto(
        TrackDetails track,
        OffsetDateTime lastPlayedAt,
        long totalListenedTimeMs
) {
    public record TrackDetails(
            UUID id,
            UUID artistId,
            String artistUsername,
            String artistAlias,
            String title,
            String coverMinioPath,
            int durationSeconds,
            String status,
            String genre,
            boolean isExplicit
    ) {
    }
}