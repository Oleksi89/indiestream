package com.indiestream.telemetry.dto.analytics;

import java.util.List;

public record TimeSeriesResponseDto(
        SummaryMetricsDto summary,
        List<TimeSeriesPointDto> dataPoints
) {
}