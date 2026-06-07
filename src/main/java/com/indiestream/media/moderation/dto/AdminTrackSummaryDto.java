package com.indiestream.media.moderation.dto;

import com.indiestream.media.catalog.domain.TrackStatus;
import lombok.Builder;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight DTO for the global admin data grid.
 */
@Builder
public record AdminTrackSummaryDto(
        UUID id,
        UUID artistId,
        String artistUsername,
        String artistAlias,
        String title,
        TrackStatus status,
        Instant createdAt
) {
}