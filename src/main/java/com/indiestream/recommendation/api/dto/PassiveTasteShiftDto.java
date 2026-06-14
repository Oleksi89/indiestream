package com.indiestream.recommendation.api.dto;

import java.util.UUID;

/**
 * DTO for cross-module communication.
 * Allows Telemetry to pass passive shifts to the AI core without exposing internal Telemetry records.
 */
public record PassiveTasteShiftDto(
        UUID userId,
        UUID trackId,
        String actionType // "FULL" or "SKIP"
) {
}