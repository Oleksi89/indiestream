package com.indiestream.recommendation.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain Event published when a user explicitly marks a track as "Not Interested".
 */
public record TrackNotInterestedEvent(
        UUID userId,
        UUID trackId,
        Instant timestamp
) {
}