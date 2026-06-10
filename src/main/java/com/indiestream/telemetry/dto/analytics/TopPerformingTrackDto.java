package com.indiestream.telemetry.dto.analytics;

import java.util.UUID;

public record TopPerformingTrackDto(
        UUID trackId,
        String title,
        String coverMinioPath,
        long plays,
        long uniqueListeners,
        double skipRate
) {
}