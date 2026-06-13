package com.indiestream.telemetry.repository.projection;

import java.time.OffsetDateTime;

/**
 * Supports both Daily and Hourly dynamically depending on the CQRS read model boundaries.
 */
public record TimeSeriesProjection(
        OffsetDateTime timestamp,
        long plays,
        long skips,
        long uniqueListeners,
        long likes
) {
}