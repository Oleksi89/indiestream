package com.indiestream.library.dto;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * BFF projection for tracks in search results.
 * Combines Media module track data with Auth module social identity.
 */
public record SearchTrackDto(
        UUID id,
        String title,
        UUID artistId,
        String artistUsername,
        String artistAlias,
        Integer durationSeconds,
        Map<String, String> stemsMetadata,
        String coverMinioPath,
        String genre,
        boolean isExplicit,
        SearchTrackTagsDto tags
) {
    public record SearchTrackTagsDto(Set<String> custom, Set<String> moods, Set<String> aiGenerated) {
    }
}