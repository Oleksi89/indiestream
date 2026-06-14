package com.indiestream.recommendation.api;

import com.indiestream.recommendation.api.dto.PassiveTasteShiftDto;

import java.util.List;

/**
 * Public facade for the Recommendation Module.
 * Enforces Spring Modulith boundaries by restricting cross-module calls to this interface.
 */
public interface RecommendationModuleApi {

    /**
     * Translates semantic text into a mathematical vector representation.
     *
     * @param compositeText The text to be analyzed (e.g., track metadata).
     * @return A 768-dimensional vector suitable for pgvector insertion.
     */
    float[] generateTextEmbedding(String compositeText);

    /**
     * Accepts a batch of passive user interactions to mutate the EMA taste vectors.
     */
    void processPassiveTasteShifts(List<PassiveTasteShiftDto> shifts);
}