package com.indiestream.media;

import java.util.UUID;

/**
 * Public metadata record exposed to other modules.
 * Part of the Media module's public API.
 */
public record TrackMetadata(
        UUID id,
        String title,
        UUID artistId,
        Integer durationSeconds,
        String coverMinioPath
) {
}