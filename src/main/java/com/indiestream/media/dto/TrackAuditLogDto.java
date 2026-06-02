package com.indiestream.media.dto;

import com.indiestream.media.domain.TrackStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Data Transfer Object representing an immutable track state transition event.
 */
public record TrackAuditLogDto(
        UUID id,
        UUID trackId,
        UUID actorId,
        TrackStatus previousStatus,
        TrackStatus newStatus,
        String reason,
        Map<String, Object> aiPayload,
        Instant createdAt
) {
}