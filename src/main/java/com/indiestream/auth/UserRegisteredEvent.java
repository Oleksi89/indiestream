package com.indiestream.auth;

import java.util.UUID;

/**
 * Domain event published when a new user is successfully registered.
 * Enriched with identity data to allow cross-module initialization (e.g., Recommendations)
 * without requiring immediate synchronous database lookups.
 */
public record UserRegisteredEvent(
        UUID userId,
        String username,
        String alias
) {
}