package com.indiestream.media.domain;

import java.util.Collections;
import java.util.Set;

/**
 * Represents the JSONB semantic tags structure for a Track.
 * <p>
 * AI Readiness : The {@code aiGenerated} set is strictly designed to accept
 * future structured JSON responses from the Gemini 1.5 Flash auto-tagging pipeline.
 * </p>
 *
 * @param custom      User-defined custom alphanumeric tags.
 * @param moods       Categorized mood identifiers.
 * @param aiGenerated AI-inferred semantic markers and structural metadata.
 */
public record TrackTags(
        Set<String> custom,
        Set<String> moods,
        Set<String> aiGenerated
) {
    public TrackTags {
        // Enforce immutability and prevent null references during JSON deserialization
        custom = custom != null ? Set.copyOf(custom) : Collections.emptySet();
        moods = moods != null ? Set.copyOf(moods) : Collections.emptySet();
        aiGenerated = aiGenerated != null ? Set.copyOf(aiGenerated) : Collections.emptySet();
    }

    /**
     * Factory method for initializing an empty robust state.
     */
    public static TrackTags empty() {
        return new TrackTags(Collections.emptySet(), Collections.emptySet(), Collections.emptySet());
    }
}