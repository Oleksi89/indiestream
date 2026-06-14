package com.indiestream.playlist.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published when a user removes a track from their "Liked Tracks" system playlist.
 * Crucial for the Recommendation Engine to accurately shift the User Taste Vector away from this track.
 */
public record TrackUnlikedEvent(
        UUID userId,
        UUID trackId,
        Instant unlikedAt
) {
}