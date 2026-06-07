package com.indiestream.media.moderation.dto;

import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.catalog.domain.TrackTags;
import lombok.Builder;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Composite DTO containing the complete aggregate state and its chronological history.
 */
@Builder
public record AdminTrackDetailsDto(
        UUID trackId,
        String title,
        UUID artistId,
        String artistAlias,
        String artistUsername,
        String artistAvatar,
        TrackStatus status,
        boolean hasAppealed,
        TrackTags currentTags,
        TrackTags artistProposedTags,
        Map<String, Object> aiPayload, // Extracted from the latest AI audit log
        List<TrackAuditLogDto> auditHistory // Chronological timeline of FSM mutations
) {
}