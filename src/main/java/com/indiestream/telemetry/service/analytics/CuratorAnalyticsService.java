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

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CuratorAnalyticsService {

    private final SupplementalAnalyticsQueryRepository queryRepository;

    @Cacheable(value = "analytics:historical", key = "#ownerId + '-' + #playlistId + '-' + #timeRange.name()")
    public PlaylistOverviewDto getPlaylistOverview(UUID playlistId, UUID ownerId, AnalyticsTimeRange timeRange) {
        AggregateMetricsProjection current = queryRepository.getPlaylistGlobalMetrics(
                playlistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset());

        AggregateMetricsProjection prev = queryRepository.getPlaylistGlobalMetrics(
                playlistId, timeRange.getPreviousStartOffset(), timeRange.getPreviousEndOffset());

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        return new PlaylistOverviewDto(summary, engagement);
    }
}