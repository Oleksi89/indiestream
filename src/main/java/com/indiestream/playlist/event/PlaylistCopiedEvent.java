package com.indiestream.playlist.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published when a playlist is deep-copied.
 * Tracks viral spread of playlists across the platform.
 */
public record PlaylistCopiedEvent(
        UUID userId,
        UUID originalPlaylistId,
        UUID newPlaylistId,
        Instant timestamp
) {
}