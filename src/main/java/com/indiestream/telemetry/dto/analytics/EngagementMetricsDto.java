package com.indiestream.telemetry.dto.analytics;

public record EngagementMetricsDto(
        double skipRatePercentage,
        double completionRatePercentage,
        double saveToPlaylistRatePercentage
) {
}