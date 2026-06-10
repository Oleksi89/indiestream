package com.indiestream.telemetry.dto.analytics;

import java.util.List;
import java.util.UUID;

public record CuratorOverviewDto(
        SummaryMetricsDto summary,
        List<TopPlaylistPerformanceDto> topPlaylists
) {
}

record TopPlaylistPerformanceDto(
        UUID playlistId,
        String name,
        long plays,
        long uniqueListeners,
        long likes
) {
}