package com.indiestream.playlist.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published when a user removes a track from a playlist.
 * Consumed by the Recommendation and Analytics modules to trigger recalculations
 * (e.g., updating the Playlist Centroid vector).
 */
public record TrackRemovedFromPlaylistEvent(
        UUID userId,
        UUID playlistId,
        UUID trackId,
        Instant timestamp
) {
}