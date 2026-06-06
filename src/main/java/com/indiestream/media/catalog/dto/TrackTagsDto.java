package com.indiestream.media.catalog.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * DTO representing the semantic tags of a track.
 * Enforces strict validation to prevent payload bloat and malicious injection.
 */
public record TrackTagsDto(
        @Size(max = 10, message = "A maximum of 10 custom tags is allowed")
        Set<@Pattern(regexp = "^[a-z0-9-]+$", message = "Custom tags must be lowercase, alphanumeric, or hyphenated") String> custom,

        @Size(max = 10, message = "A maximum of 10 mood tags is allowed")
        Set<@Pattern(regexp = "^[a-z0-9-]+$", message = "Mood tags must be lowercase, alphanumeric, or hyphenated") String> moods,

        @Size(max = 20, message = "A maximum of 20 AI tags is allowed")
        Set<String> aiGenerated
) {
}