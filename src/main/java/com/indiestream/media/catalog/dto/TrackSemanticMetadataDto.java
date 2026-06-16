package com.indiestream.media.catalog.dto;

import java.util.Set;

/**
 * Clean DTO to pass metadata to the Recommendation engine without exposing the Track entity.
 */
public record TrackSemanticMetadataDto(
        String genre,
        String tempo,
        Set<String> moods,
        Set<String> aiGenerated,
        Set<String> custom
) {
}