package com.indiestream.playlist.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published when a user successfully adds a track to any playlist.
 * Consumed by the Recommendation module to build user-track affinity vectors.
 */
public record TrackAddedToPlaylistEvent(
        UUID userId,
        UUID playlistId,
        UUID trackId,
        Instant timestamp
) {
}