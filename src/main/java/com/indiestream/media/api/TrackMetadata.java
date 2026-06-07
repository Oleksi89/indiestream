package com.indiestream.media.api;

import com.indiestream.media.catalog.domain.TrackStatus;

import java.util.Map;
import java.util.Set;
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
        Map<String, String> stemsMetadata,
        String coverMinioPath,

        // Semantic Metadata
        String genre,
        boolean isExplicit,
        Set<String> customTags,
        Set<String> aiGeneratedTags,

        TrackStatus status
) {
}