package com.indiestream.auth.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Cross-module domain event representing a global user suspension.
 * Owned by the Auth module; published by other modules (e.g., Media Moderation)
 * to trigger account lockdowns.
 */
public record UserBannedEvent(
        UUID userId,
        String userRole,
        UUID adminId,
        String reason,
        Instant timestamp
) {
}