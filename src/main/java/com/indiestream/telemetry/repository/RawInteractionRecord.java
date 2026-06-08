package com.indiestream.telemetry.repository;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Internal Data Record for JDBC batch inserts.
 * Maps exactly to the raw_interaction_logs partitioned table.
 */
public record RawInteractionRecord(
        UUID eventId,
        UUID userId,
        UUID targetId,
        String interactionType,
        String sourceType,
        String uiSurface,
        OffsetDateTime createdAt
) {
}