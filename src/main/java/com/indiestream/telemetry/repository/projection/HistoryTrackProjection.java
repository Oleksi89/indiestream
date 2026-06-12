package com.indiestream.telemetry.repository.projection;

import java.time.OffsetDateTime;
import java.util.UUID;

public record HistoryTrackProjection(
        UUID trackId,
        String title,
        UUID artistId,
        int durationSeconds,
        String coverMinioPath,
        String status,
        String genre,
        boolean isExplicit,
        OffsetDateTime lastPlayedAt,
        long totalListenedTimeMs
) {
}