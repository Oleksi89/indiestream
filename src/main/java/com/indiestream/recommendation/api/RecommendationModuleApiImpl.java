package com.indiestream.recommendation.api;

import com.indiestream.recommendation.service.EmbeddingProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Implementation of the public API facade.
 * Delegates work to internal, package-private domain workers.
 */
@Service
@RequiredArgsConstructor
public class RecommendationModuleApiImpl implements RecommendationModuleApi {

    private final EmbeddingProviderService embeddingProviderService;

    @Override
    public float[] generateTextEmbedding(String compositeText) {
        return embeddingProviderService.generateEmbedding(compositeText);
    }
}