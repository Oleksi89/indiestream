package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.config.TelemetryCacheTemplate;
import com.indiestream.telemetry.dto.analytics.EngagementMetricsDto;
import com.indiestream.telemetry.dto.analytics.PlaylistOverviewDto;
import com.indiestream.telemetry.dto.analytics.SummaryMetricsDto;
import com.indiestream.telemetry.repository.SupplementalAnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Orchestrates playlist performance analytics for Curators.
 * Utilizes centralized programmatic Redis caching to ensure reliable execution.
 */
@Service
@RequiredArgsConstructor
public class CuratorAnalyticsService {

    private final SupplementalAnalyticsQueryRepository queryRepository;
    private final TelemetryCacheTemplate cacheTemplate;

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final String CACHE_PREFIX = "analytics:historical:";

    public PlaylistOverviewDto getPlaylistOverview(UUID playlistId, UUID ownerId, OffsetDateTime startDate, OffsetDateTime endDate) {
        OffsetDateTime snappedStart = snapToFiveMinutes(startDate);
        OffsetDateTime snappedEnd = snapToFiveMinutes(endDate);
        String cacheKey = CACHE_PREFIX + "playlist:" + ownerId + ":" + playlistId + ":" + snappedStart.toEpochSecond() + ":" + snappedEnd.toEpochSecond();

        return cacheTemplate.getOrCompute(cacheKey, PlaylistOverviewDto.class, CACHE_TTL, () -> {
            long durationSeconds = ChronoUnit.SECONDS.between(snappedStart, snappedEnd);
            OffsetDateTime prevStart = snappedStart.minusSeconds(durationSeconds);
            OffsetDateTime prevEnd = snappedStart.minusNanos(1000000);

            AggregateMetricsProjection current = queryRepository.getPlaylistGlobalMetrics(
                    playlistId, snappedStart, snappedEnd);

            AggregateMetricsProjection prev = queryRepository.getPlaylistGlobalMetrics(
                    playlistId, prevStart, prevEnd);

            SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
            EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

            return new PlaylistOverviewDto(summary, engagement);
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