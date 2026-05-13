package com.indiestream.auth;

import java.util.UUID;

/**
 * Represents a read-only public identity of a user.
 * Shared across modules via AuthModuleApi to prevent leaking sensitive data (email, roles).
 */
public record UserPublicProfile(
        UUID id,
        String username,
        String alias
) {
}