package com.indiestream.telemetry.repository.projection;

import java.time.LocalDate;

public record TimeSeriesProjection(
        LocalDate dateTimestamp,
        long plays,
        long skips,
        long uniqueListeners,
        long likes
) {
}