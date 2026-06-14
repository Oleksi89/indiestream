package com.indiestream.recommendation.service;

import com.indiestream.recommendation.exception.EmbeddingGenerationException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

/**
 * Package-private internal worker for generating mathematical vectors.
 * Strictly encapsulated within the recommendation module.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingProviderService {

    public final EmbeddingModel embeddingModel;

    private static final int EXPECTED_DIMENSIONS = 768;
    private static final String RESILIENCE_INSTANCE = "openai-embedding";

    /**
     * Generates a 768-dimensional float[] vector using the configured LLM model.
     * Protected by Resilience4j Retry and CircuitBreaker to prevent cascading failures
     * if the OpenAI API is rate-limited (429) or down (5xx).
     *
     * @param text The composite semantic string (e.g., Genre + Mood + Tags).
     * @return Mathematical vector representation.
     */
    @Retry(name = RESILIENCE_INSTANCE, fallbackMethod = "embeddingFallback")
    @CircuitBreaker(name = RESILIENCE_INSTANCE, fallbackMethod = "embeddingFallback")
    public float[] generateEmbedding(String text) {
        Assert.hasText(text, "Cannot generate embedding for empty or null text");

        log.debug("Generating embeddings for text length: {}", text.length());

        // Spring AI 1.1.x native embed() returns float[] seamlessly
        float[] vector = embeddingModel.embed(text);

        if (vector.length != EXPECTED_DIMENSIONS) {
            log.error("Dimensionality mismatch. Expected {}, but got {}", EXPECTED_DIMENSIONS, vector.length);
            throw new EmbeddingGenerationException(
                    "Dimensionality mismatch: Model returned " + vector.length + " dimensions instead of " + EXPECTED_DIMENSIONS,
                    null
            );
        }

        return vector;
    }

    /**
     * Fallback method invoked by Resilience4j when retries are exhausted or circuit is open.
     * We MUST NOT return a dummy vector (e.g., all zeros), as this would corrupt the HNSW index math.
     * Instead, we throw a domain exception to signal the pipeline to mark the track as FAILED.
     */
    @SuppressWarnings("unused")
    private float[] embeddingFallback(String text, Throwable t) {
        log.error("Embedding generation fallback triggered due to: {}", t.getMessage());
        throw new EmbeddingGenerationException("Failed to generate embedding after retries for text chunk.", t);
    }
}