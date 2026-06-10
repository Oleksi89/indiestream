package com.indiestream.telemetry.repository.projection;

public record AggregateMetricsProjection(
        long totalPlays,
        long totalSkips,
        long uniqueListeners,
        long totalLikes
) {
}