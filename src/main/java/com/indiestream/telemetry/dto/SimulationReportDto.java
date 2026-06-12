package com.indiestream.telemetry.dto;

import java.util.Map;

public record SimulationReportDto(
        int totalPlaybacksGenerated,
        int totalInteractionsGenerated,
        int fullPlays,
        int skips,
        int trackLikes,
        int playlistFollows,
        int eventsAssignedToTargetUser,
        Map<String, Integer> trafficByCountry,
        Map<String, Integer> trafficBySourceType
) {
}