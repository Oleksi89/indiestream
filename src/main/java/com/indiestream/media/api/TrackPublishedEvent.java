package com.indiestream.media.api;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain event published when a Track successfully transitions to the PUBLISHED state.
 * Acts as an integration trigger for cross-module operations (e.g., AI Vectorization, Notifications).
 */
public record TrackPublishedEvent(
        UUID trackId,
        Instant publishedAt
) {
}