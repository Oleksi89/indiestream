package com.indiestream.auth.dto;

import com.indiestream.auth.domain.Role;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
        UUID id,
        String email,
        String username,
        String alias,
        Role role,
        Instant createdAt
) {
}