package com.indiestream.telemetry.dto.analytics;

/**
 * Data Transfer Object representing global platform-wide statistics for administrative insights.
 * Orchestrates broad macroeconomic system indicators and overarching catalog interactions.
 */
public record PlatformOverviewDto(
        SummaryMetricsDto summary,
        EngagementMetricsDto engagement
) {
}