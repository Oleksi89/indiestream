package com.indiestream.media.api;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain event published when a Track successfully passes moderation and transitions to the APPROVED state.
 * Used to trigger one-time heavy background processes (like AI Vectorization) before public release.
 */
public record TrackApprovedEvent(
        UUID trackId,
        Instant approvedAt
) {
}