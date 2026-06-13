package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.dto.analytics.EngagementMetricsDto;
import com.indiestream.telemetry.dto.analytics.PlatformOverviewDto;
import com.indiestream.telemetry.dto.analytics.SummaryMetricsDto;
import com.indiestream.telemetry.repository.SupplementalAnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final SupplementalAnalyticsQueryRepository queryRepository;

    @Cacheable(value = "analytics:historical", key = "'platform-global-' + #startDate.toEpochSecond() + '-' + #endDate.toEpochSecond()")
    public PlatformOverviewDto getPlatformOverview(OffsetDateTime startDate, OffsetDateTime endDate) {
        long durationSeconds = ChronoUnit.SECONDS.between(startDate, endDate);
        OffsetDateTime prevStart = startDate.minusSeconds(durationSeconds);
        OffsetDateTime prevEnd = startDate.minusNanos(1000000);

        AggregateMetricsProjection current = queryRepository.getPlatformGlobalMetrics(startDate, endDate);
        AggregateMetricsProjection prev = queryRepository.getPlatformGlobalMetrics(prevStart, prevEnd);

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        return new PlatformOverviewDto(summary, engagement);
    }
}