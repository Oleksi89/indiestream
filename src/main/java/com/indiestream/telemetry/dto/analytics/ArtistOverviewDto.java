package com.indiestream.telemetry.dto.analytics;

import java.util.List;

public record ArtistOverviewDto(
        SummaryMetricsDto summary,
        EngagementMetricsDto engagement,
        List<TopPerformingTrackDto> topTracks
) {
}