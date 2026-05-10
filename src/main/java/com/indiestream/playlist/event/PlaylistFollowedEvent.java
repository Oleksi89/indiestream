package com.indiestream.playlist.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published when a user follows a playlist.
 * Acts as a signal for the AI Recommendation module to update user-vector weightings.
 */
public record PlaylistFollowedEvent(
        UUID userId,
        UUID playlistId,
        Instant followedAt
) {
}