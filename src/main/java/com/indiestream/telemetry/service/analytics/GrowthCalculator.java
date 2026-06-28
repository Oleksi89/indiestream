package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import com.indiestream.telemetry.dto.analytics.EngagementMetricsDto;
import com.indiestream.telemetry.dto.analytics.SummaryMetricsDto;
import lombok.experimental.UtilityClass;

@UtilityClass
public class GrowthCalculator {

    public static double calculatePercentage(long current, long previous) {
        if (previous == 0) {
            return current > 0 ? 100.0 : 0.0;
        }
        return ((double) (current - previous) / previous) * 100.0;
    }

    public static SummaryMetricsDto buildSummary(AggregateMetricsProjection current, AggregateMetricsProjection prev) {
        if (current == null) current = new AggregateMetricsProjection(0, 0, 0, 0);
        if (prev == null) prev = new AggregateMetricsProjection(0, 0, 0, 0);

        return new SummaryMetricsDto(
                current.totalPlays(),
                calculatePercentage(current.totalPlays(), prev.totalPlays()),
                current.totalLikes(),
                calculatePercentage(current.totalLikes(), prev.totalLikes()),
                current.uniqueListeners(),
                calculatePercentage(current.uniqueListeners(), prev.uniqueListeners())
        );
    }

    public static EngagementMetricsDto buildEngagement(AggregateMetricsProjection current) {
        if (current == null || current.totalPlays() == 0) {
            return new EngagementMetricsDto(0.0, 0.0, 0.0);
        }

        long totalAttempts = current.totalPlays() + current.totalSkips();

        if (totalAttempts == 0) {
            return new EngagementMetricsDto(0.0, 0.0, 0.0);
        }

        double skipRate = (current.totalSkips() / (double) totalAttempts) * 100.0;
        double completionRate = (current.totalPlays() / (double) totalAttempts) * 100.0;
        double saveRate = (current.totalLikes() / (double) current.totalPlays()) * 100.0;

        return new EngagementMetricsDto(skipRate, completionRate, saveRate);
    }
}