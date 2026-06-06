package com.indiestream.media.moderation.dto;

import com.indiestream.media.catalog.domain.TrackStatus;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Contract for executing an explicit track state transition via HTTP API.
 */
public record TrackStatusTransitionRequest(
        @NotNull(message = "Target status cannot be null")
        TrackStatus targetStatus,

        String reason,

        Map<String, Object> aiPayload
) {
}