package com.indiestream.playlist.dto;

import java.time.Instant;
import java.util.UUID;

public record PlaylistDto(
        UUID id,
        UUID ownerId,
        String ownerUsername,
        String ownerAlias,
        String name,
        String description,
        String coverMinioPath,
        Boolean isPublic,
        Boolean isSystem,
        Boolean isCollaborative,
        Integer trackCount,
        Integer totalDurationSeconds,
        Integer followersCount,
        Instant createdAt,
        Instant updatedAt
) {
}