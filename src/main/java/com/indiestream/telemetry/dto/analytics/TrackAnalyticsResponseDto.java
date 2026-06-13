package com.indiestream.telemetry.dto.analytics;

import java.util.List;

public record TrackAnalyticsResponseDto(
        String trackTitle,
        String coverMinioPath,
        Double popularityScore,
        SummaryMetricsDto summary,
        EngagementMetricsDto engagement,
        List<TimeSeriesPointDto> timeSeries,
        List<AttributionMetricDto> attribution,
        List<RegionStatDto> demographics,
        long currentConcurrentListeners
) {
    public TrackAnalyticsResponseDto withConcurrentListeners(long concurrentListeners) {
        return new TrackAnalyticsResponseDto(
                trackTitle, coverMinioPath, popularityScore,
                summary, engagement, timeSeries, attribution, demographics, concurrentListeners
        );
    }
}