package com.indiestream.playlist.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Specifically published when a track is added to the system "Liked Tracks" playlist.
 * Carries a higher semantic weight for AI recommendations than a standard playlist addition.
 */
public record TrackLikedEvent(
        UUID userId,
        UUID trackId,
        Instant likedAt
) {
}