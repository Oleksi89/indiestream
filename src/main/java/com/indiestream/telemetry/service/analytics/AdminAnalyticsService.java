package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.domain.AnalyticsTimeRange;
import com.indiestream.telemetry.dto.analytics.SummaryMetricsDto;
import com.indiestream.telemetry.repository.SupplementalAnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final SupplementalAnalyticsQueryRepository queryRepository;

    @Cacheable(value = "analytics:historical", key = "'platform-global-' + #timeRange.name()")
    public SummaryMetricsDto getPlatformOverview(AnalyticsTimeRange timeRange) {
        AggregateMetricsProjection current = queryRepository.getPlatformGlobalMetrics(
                timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset());

        AggregateMetricsProjection prev = queryRepository.getPlatformGlobalMetrics(
                timeRange.getPreviousStartOffset(), timeRange.getCurrentStartOffset());

        return GrowthCalculator.buildSummary(current, prev);
    }
}