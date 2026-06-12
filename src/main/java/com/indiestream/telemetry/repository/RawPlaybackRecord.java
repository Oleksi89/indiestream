package com.indiestream.telemetry.repository;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Internal Data Record for JDBC batch inserts.
 * Maps exactly to the raw_playback_logs partitioned table.
 */
public record RawPlaybackRecord(
        UUID eventId,
        UUID userId,
        UUID trackId,
        UUID sessionId,
        int startPositionMs,
        int endPositionMs,
        int playbackDurationMs,
        String clientIp,
        String userAgent,
        boolean isSuspectedBot,
        String playbackStatus,
        String sourceType,
        UUID sourceId,
        String clientCountry,
        OffsetDateTime createdAt
) {
}