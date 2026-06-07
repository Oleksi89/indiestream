package com.indiestream.auth.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Cross-module event published to request the restoration of a banned user.
 */
public record UserUnbanRequestedEvent(
        UUID userId,
        UUID adminId,
        String reason,
        Instant timestamp
) {
}