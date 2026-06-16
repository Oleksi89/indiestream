package com.indiestream.recommendation.service;

import com.indiestream.media.catalog.dto.TrackSemanticMetadataDto;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Centralized SRP component to enforce consistent LLM embedding inputs.
 * Guarantees that asynchronous workers and Admin Re-indexing APIs generate
 * mathematically identical vectors for the same track state.
 */
@Component
public class SemanticPayloadExtractor {

    /**
     * Constructs a high-density, predictable semantic string for the LLM Embedding model.
     * Order of concatenation is fixed to maintain stable attention mechanism weights in transformers.
     */
    public String extract(TrackSemanticMetadataDto meta) {
        String genre = StringUtils.hasText(meta.genre()) ? meta.genre() : "Unknown Genre";
        String moods = String.join(", ", meta.moods());
        String aiGenerated = String.join(", ", meta.aiGenerated());
        String custom = String.join(", ", meta.custom());

        return String.format(
                "Genre: %s. Tempo: %s. Moods: %s. AI Labels: %s. Custom Tags: %s.",
                genre, meta.tempo(),
                StringUtils.hasText(moods) ? moods : "None",
                StringUtils.hasText(aiGenerated) ? aiGenerated : "None",
                StringUtils.hasText(custom) ? custom : "None"
        );
    }
}