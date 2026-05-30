package com.indiestream.playlist.dto;

import com.indiestream.auth.UserPublicProfile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PlaylistDto(
        UUID id,
        UUID ownerId,
        String ownerUsername,
        String ownerAlias,
        String ownerAvatarPath,
        String name,
        String description,
        String coverMinioPath,
        Boolean isPublic,
        Boolean isSystem,
        Boolean isCollaborative,
        Integer trackCount,
        Integer totalDurationSeconds,
        Integer followersCount,
        List<UserPublicProfile> collaborators,
        Instant createdAt,
        Instant updatedAt
) {
}