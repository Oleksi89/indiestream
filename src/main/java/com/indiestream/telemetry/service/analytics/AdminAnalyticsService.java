package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.config.TelemetryCacheTemplate;
import com.indiestream.telemetry.dto.analytics.EngagementMetricsDto;
import com.indiestream.telemetry.dto.analytics.PlatformOverviewDto;
import com.indiestream.telemetry.dto.analytics.SummaryMetricsDto;
import com.indiestream.telemetry.repository.SupplementalAnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Orchestrates platform-wide analytical models for Administrators.
 * Utilizes centralized programmatic Redis caching.
 */
@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final SupplementalAnalyticsQueryRepository queryRepository;
    private final TelemetryCacheTemplate cacheTemplate;

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final String CACHE_PREFIX = "analytics:historical:";

    public PlatformOverviewDto getPlatformOverview(OffsetDateTime startDate, OffsetDateTime endDate) {
        // 1. Time Snapping
        OffsetDateTime snappedStart = snapToFiveMinutes(startDate);
        OffsetDateTime snappedEnd = snapToFiveMinutes(endDate);

        // 2. Generate Key based on snapped time
        String cacheKey = CACHE_PREFIX + "platform-global:" + snappedStart.toEpochSecond() + ":" + snappedEnd.toEpochSecond();

        return cacheTemplate.getOrCompute(cacheKey, PlatformOverviewDto.class, CACHE_TTL, () -> {
            long durationSeconds = ChronoUnit.SECONDS.between(snappedStart, snappedEnd);
            OffsetDateTime prevStart = snappedStart.minusSeconds(durationSeconds);
            OffsetDateTime prevEnd = snappedStart.minusNanos(1000000);

            AggregateMetricsProjection current = queryRepository.getPlatformGlobalMetrics(startDate, endDate);
            AggregateMetricsProjection prev = queryRepository.getPlatformGlobalMetrics(prevStart, prevEnd);

            SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
            EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

            return new PlatformOverviewDto(summary, engagement);
        });
    }

    /**
     * Normalizes the timestamp to the nearest 5-minute floor.
     * Prevents cache fragmentation aligning with the 5-minute rollup workers.
     */
    private OffsetDateTime snapToFiveMinutes(OffsetDateTime dateTime) {
        long epochSeconds = dateTime.toEpochSecond();
        long snappedSeconds = epochSeconds - (epochSeconds % 300);
        return OffsetDateTime.ofInstant(java.time.Instant.ofEpochSecond(snappedSeconds), dateTime.getOffset());
    }
}