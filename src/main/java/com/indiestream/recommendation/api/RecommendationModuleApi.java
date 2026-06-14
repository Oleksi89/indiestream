package com.indiestream.recommendation.api;

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
}