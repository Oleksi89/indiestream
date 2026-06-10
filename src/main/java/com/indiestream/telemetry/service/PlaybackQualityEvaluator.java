package com.indiestream.telemetry.service;

import com.indiestream.telemetry.cache.TrackDurationCache;
import com.indiestream.telemetry.domain.PlaybackStatus;
import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Evaluates the quality of a playback segment
 */
@Service
@RequiredArgsConstructor
public class PlaybackQualityEvaluator {

    private final TrackDurationCache durationCache;

    private static final int MIN_VALID_DURATION_MS = 2000; // 2 seconds misclick barrier
    private static final int SKIP_THRESHOLD_MS = 30_000; // Playbacks under 30s are considered skips.
    private static final double FULL_PLAYBACK_RATIO = 0.80;

    public PlaybackStatus evaluate(PlaybackTelemetryPayload payload) {
        if (payload.playbackDurationMs() < MIN_VALID_DURATION_MS) {
            return PlaybackStatus.UNKNOWN;
        }

        if (payload.playbackDurationMs() < SKIP_THRESHOLD_MS) {
            return PlaybackStatus.SKIP;
        }

        Integer durationSeconds = durationCache.getDurationSeconds(payload.trackId());

        if (durationSeconds == null || durationSeconds == 0) {
            // Cannot evaluate mathematically without track duration.
            // Log as UNKNOWN to allow manual resolution or data warehouse ETL fixing later.
            return PlaybackStatus.UNKNOWN;
        }

        int trackDurationMs = durationSeconds * 1000;
        double ratio = (double) payload.playbackDurationMs() / trackDurationMs;

        return ratio >= FULL_PLAYBACK_RATIO ? PlaybackStatus.FULL : PlaybackStatus.PARTIAL;
    }
}