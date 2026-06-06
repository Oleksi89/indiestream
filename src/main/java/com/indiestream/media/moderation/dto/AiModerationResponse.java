package com.indiestream.media.moderation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.indiestream.media.moderation.domain.ModerationVerdict;
import com.indiestream.media.moderation.domain.ViolationCategory;

import java.util.Set;

/**
 * Strict data contract for the Spring AI BeanOutputConverter.
 * Defines the exact JSON schema AI must adhere to.
 */
public record AiModerationResponse(
        @JsonProperty(required = true)
        @JsonPropertyDescription("The final moderation verdict based on platform policies.")
        ModerationVerdict verdict,

        @JsonProperty(required = true)
        @JsonPropertyDescription("The primary category of violation. Use NONE if CLEAN.")
        ViolationCategory category,

        @JsonProperty(required = true)
        @JsonPropertyDescription("Confidence score of the assessment between 0.0 and 1.0.")
        double confidenceScore,

        @JsonProperty(required = true)
        @JsonPropertyDescription("Detailed reasoning for the verdict. Mandatory if the verdict is not CLEAN. Be specific about timestamps or visual elements if applicable.")
        String reasoning,

        @JsonProperty(required = true)
        @JsonPropertyDescription("A curated set of 1 to 5 mood tags fitting the track's acoustic profile. Must be lowercase, alphanumeric, hyphenated.")
        Set<String> suggestedMoods,

        @JsonProperty(required = true)
        @JsonPropertyDescription("A curated set of 1 to 3 genre tags fitting the track's acoustic profile. Must be lowercase, alphanumeric, hyphenated.")
        Set<String> suggestedGenres
) {
}