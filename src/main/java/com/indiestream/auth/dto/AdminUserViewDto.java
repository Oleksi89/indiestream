package com.indiestream.auth.dto;

import com.indiestream.auth.domain.Role;

import java.time.Instant;
import java.util.UUID;

/**
 * Projection DTO for administrative user management interfaces.
 * Flattened to simplify frontend rendering.
 */
public record AdminUserViewDto(
        UUID id,
        String email,
        String username,
        String alias,
        Role role,
        Boolean isBanned,
        String avatarPath,
        Instant createdAt
) {
}