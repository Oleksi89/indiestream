package com.indiestream.recommendation.worker;

import com.indiestream.media.api.MediaRecommendationFacade;
import com.indiestream.media.api.TrackApprovedEvent;
import com.indiestream.recommendation.service.EmbeddingProviderService;
import com.indiestream.recommendation.service.SemanticPayloadExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Asynchronous orchestrator for generating track Vector representations.
 * Listens to TrackPublishedEvent to decouple the LLM generation latency from the main HTTP thread.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrackVectorizationWorker {

    private final EmbeddingProviderService embeddingProviderService;
    private final MediaRecommendationFacade mediaRecommendationFacade;
    private final SemanticPayloadExtractor payloadExtractor;

    /**
     * Executes strictly AFTER the track state transition commits to the database,
     * ensuring we read the finalized metadata. Uses @Async to free up the FSM thread.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processTrackVectorization(TrackApprovedEvent event) {
        if (mediaRecommendationFacade.hasVector(event.trackId())) return;

        mediaRecommendationFacade.getTrackSemanticMetadata(event.trackId()).ifPresentOrElse(
                meta -> {
                    try {
                        String semanticPayload = payloadExtractor.extract(meta);
                        float[] vector = embeddingProviderService.generateEmbedding(semanticPayload);
                        mediaRecommendationFacade.updateTrackVector(event.trackId(), vector);
                        log.info("Successfully generated Vector for track: {}", event.trackId());
                    } catch (Exception e) {
                        log.error("Vector generation failed for track {}: {}", event.trackId(), e.getMessage());
                    }
                },
                () -> log.error("Track metadata not found for vectorization: {}", event.trackId())
        );
    }
}