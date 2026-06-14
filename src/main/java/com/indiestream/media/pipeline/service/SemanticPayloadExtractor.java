package com.indiestream.media.pipeline.service;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackTags;
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
    public String extract(Track track) {
        String genre = StringUtils.hasText(track.getGenre()) ? track.getGenre() : "Unknown Genre";
        TrackTags tags = track.getTags() != null ? track.getTags() : TrackTags.empty();

        String moods = String.join(", ", tags.moods());
        String aiGenerated = String.join(", ", tags.aiGenerated());
        String custom = String.join(", ", tags.custom());

        // Extract Tempo or set default if metadata parsing failed during ingestion
        String tempo = track.getStemsMetadata().getOrDefault("tempo", "Unknown Tempo");

        return String.format(
                "Genre: %s. Tempo: %s. Moods: %s. AI Labels: %s. Custom Tags: %s.",
                genre,
                tempo,
                StringUtils.hasText(moods) ? moods : "None",
                StringUtils.hasText(aiGenerated) ? aiGenerated : "None",
                StringUtils.hasText(custom) ? custom : "None"
        );
    }
}