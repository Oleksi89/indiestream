package com.indiestream.auth.dto;

import com.indiestream.auth.domain.Role;

import java.time.Instant;
import java.util.UUID;

/**
 * View Model DTO specifically formulated for rendering rich profile pages.
 * Integrates dynamic context (isFollowedByMe) with denormalized metrics.
 */
public record UserProfileResponse(
        UUID id,
        String email,
        String username,
        String alias,
        Role role,
        UserProfileDto profile,
        Instant createdAt,
        Long followersCount,
        Long followingCount,
        Boolean isFollowedByMe
) {
}