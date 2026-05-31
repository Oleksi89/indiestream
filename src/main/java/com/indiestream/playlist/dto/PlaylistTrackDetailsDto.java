package com.indiestream.playlist.dto;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public record PlaylistTrackDetailsDto(
        UUID trackId,
        String title,
        UUID artistId,
        String artistUsername,
        String artistAlias,
        Integer durationSeconds,
        Map<String, String> stemsMetadata,
        String coverMinioPath,
        UUID addedByUserId,
        Instant addedAt,
        
        // Semantic Metadata
        String genre,
        boolean isExplicit,
        PlaylistTrackTagsDto tags
) {
    /**
     * Encapsulated representation of semantic tags for the Playlist module boundary.
     */
    public record PlaylistTrackTagsDto(
            Set<String> custom,
            Set<String> moods,
            Set<String> aiGenerated
    ) {
    }
}