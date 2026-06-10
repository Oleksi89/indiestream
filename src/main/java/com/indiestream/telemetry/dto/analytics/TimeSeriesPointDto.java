package com.indiestream.telemetry.dto.analytics;

import java.time.OffsetDateTime;

public record TimeSeriesPointDto(
        OffsetDateTime timestamp,
        long plays,
        long uniqueListeners,
        long skips,
        long likes
) {
}