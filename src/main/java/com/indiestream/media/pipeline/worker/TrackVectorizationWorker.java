package com.indiestream.media.pipeline.worker;

import com.indiestream.media.api.TrackPublishedEvent;
import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackTags;
import com.indiestream.media.catalog.repository.TrackRepository;
import com.indiestream.media.pipeline.service.SemanticPayloadExtractor;
import com.indiestream.recommendation.api.RecommendationModuleApi;
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

    private final RecommendationModuleApi recommendationModuleApi;
    private final TrackRepository trackRepository;
    private final SemanticPayloadExtractor payloadExtractor;

    /**
     * Executes strictly AFTER the track state transition commits to the database,
     * ensuring we read the finalized metadata. Uses @Async to free up the FSM thread.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processTrackVectorization(TrackPublishedEvent event) {
        log.info("Initiating vectorization for published track: {}", event.trackId());

        trackRepository.findById(event.trackId()).ifPresentOrElse(
                this::generateAndSaveVector,
                () -> log.error("Vectorization failed. Track {} not found.", event.trackId())
        );
    }

    private void generateAndSaveVector(Track track) {
        if (track.getVector() != null) {
            log.debug("Track {} already has an initialized vector space. Skipping.", track.getId());
            return;
        }

        try {
            String semanticPayload = payloadExtractor.extract(track);
            log.debug("Extracted semantic payload for Track {}: {}", track.getId(), semanticPayload);

            // Relies on Resilience4j internally in RecommendationModuleApi to handle 429/5xx errors
            float[] vector = recommendationModuleApi.generateTextEmbedding(semanticPayload);

            trackRepository.updateTrackVector(track.getId(), vector);
            log.info("Successfully mathematical projection $V_track$ generated and saved for track: {}", track.getId());

        } catch (Exception e) {
            // Do not throw to avoid crashing the @Async thread. FAILED vector generation
            // should be caught by Admin Analytics for manual re-indexing.
            log.error("Severe failure during AI vector generation for track {}: {}", track.getId(), e.getMessage(), e);
        }
    }
}