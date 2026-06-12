package com.indiestream.telemetry.dto.analytics;

import java.util.List;

public record TrackAnalyticsResponseDto(
        SummaryMetricsDto summary,
        EngagementMetricsDto engagement,
        List<TimeSeriesPointDto> timeSeries,
        List<AttributionMetricDto> attribution,
        List<RegionStatDto> demographics,
        long currentConcurrentListeners
) {
    public TrackAnalyticsResponseDto withConcurrentListeners(long concurrentListeners) {
        return new TrackAnalyticsResponseDto(summary, engagement, timeSeries, attribution, demographics, concurrentListeners);
    }
}