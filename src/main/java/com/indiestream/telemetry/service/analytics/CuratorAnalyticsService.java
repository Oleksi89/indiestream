package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.domain.AnalyticsTimeRange;
import com.indiestream.telemetry.dto.analytics.EngagementMetricsDto;
import com.indiestream.telemetry.dto.analytics.PlaylistOverviewDto;
import com.indiestream.telemetry.dto.analytics.SummaryMetricsDto;
import com.indiestream.telemetry.repository.SupplementalAnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CuratorAnalyticsService {

    private final SupplementalAnalyticsQueryRepository queryRepository;

    @Cacheable(value = "analytics:historical", key = "#ownerId + '-' + #playlistId + '-' + #startDate.toEpochSecond() + '-' + #endDate.toEpochSecond()")
    public PlaylistOverviewDto getPlaylistOverview(UUID playlistId, UUID ownerId, OffsetDateTime startDate, OffsetDateTime endDate) {
        long durationSeconds = ChronoUnit.SECONDS.between(startDate, endDate);
        OffsetDateTime prevStart = startDate.minusSeconds(durationSeconds);
        OffsetDateTime prevEnd = startDate.minusNanos(1000000);

        AggregateMetricsProjection current = queryRepository.getPlaylistGlobalMetrics(
                playlistId, startDate, endDate);

        AggregateMetricsProjection prev = queryRepository.getPlaylistGlobalMetrics(
                playlistId, prevStart, prevEnd);

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        return new PlaylistOverviewDto(summary, engagement);
    }
}