package com.indiestream.telemetry.dto.analytics;

public record AttributionMetricDto(
        String sourceType,
        long rawCount,
        double percentage
) {
}