package com.indiestream.telemetry.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * DTO for incoming playback telemetry segments.
 * Excludes user_id to prevent client-side spoofing; identity is strictly resolved via SecurityContext.
 */
public record PlaybackTelemetryPayload(
        @NotNull(message = "Event ID cannot be null")
        UUID eventId,

        @NotNull(message = "Track ID cannot be null")
        UUID trackId,

        @NotNull(message = "Session ID cannot be null")
        UUID sessionId,

        @Min(value = 0, message = "Start position must be positive")
        int startPositionMs,

        @Min(value = 0, message = "End position must be positive")
        int endPositionMs,

        @Min(value = 2000, message = "Playback duration must be at least 2000ms to filter out misclicks")
        int playbackDurationMs
) {
    public PlaybackTelemetryPayload {
        if (endPositionMs < startPositionMs) {
            // Fails fast at the Controller layer, caught by GlobalExceptionHandler
            throw new IllegalArgumentException("End position cannot be strictly less than start position");
        }
        // Note: playbackDurationMs is not forced to equal (end - start)
        // to account for user actions like playback speed adjustments or buffering pauses.
    }
}