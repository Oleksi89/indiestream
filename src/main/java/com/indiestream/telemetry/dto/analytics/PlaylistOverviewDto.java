package com.indiestream.telemetry.dto.analytics;

/**
 * Data Transfer Object representing aggregated playlist performance analytics.
 * Combines statistical summary rows with calculated user retention and engagement flags.
 */
public record PlaylistOverviewDto(
        SummaryMetricsDto summary,
        EngagementMetricsDto engagement
) {
}