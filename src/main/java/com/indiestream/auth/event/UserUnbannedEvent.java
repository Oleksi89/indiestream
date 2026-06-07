package com.indiestream.auth.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Cross-module domain event representing a global user unban.
 */
public record UserUnbannedEvent(
        UUID userId,
        UUID adminId,
        String reason,
        Instant timestamp
) {
}