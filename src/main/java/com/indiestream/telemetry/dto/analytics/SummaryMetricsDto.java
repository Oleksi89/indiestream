package com.indiestream.telemetry.dto.analytics;

public record SummaryMetricsDto(
        long totalPlays,
        double playsGrowthPercentage,
        long totalLikes,
        double likesGrowthPercentage,
        long uniqueListeners,
        double listenersGrowthPercentage
) {
}