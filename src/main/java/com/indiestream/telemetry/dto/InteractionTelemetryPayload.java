package com.indiestream.telemetry.dto;

import com.indiestream.telemetry.domain.InteractionType;
import com.indiestream.telemetry.domain.TelemetrySourceType;
import com.indiestream.telemetry.domain.UiSurface;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * DTO for incoming user interactions.
 * Relies on Enum mapping to enforce strict payload constraints before hitting the Redis Stream.
 */
public record InteractionTelemetryPayload(
        @NotNull(message = "Event ID cannot be null")
        UUID eventId,

        @NotNull(message = "Target ID cannot be null")
        UUID targetId,

        @NotNull(message = "Interaction type cannot be null")
        InteractionType interactionType,

        @NotNull(message = "Source type cannot be null")
        TelemetrySourceType sourceType,

        @NotNull(message = "UI surface cannot be null")
        UiSurface uiSurface
) {
}