package com.indiestream.recommendation.service;

import com.indiestream.media.api.MediaRecommendationFacade;
import com.indiestream.recommendation.dto.ReindexRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Background worker for administrative vector governance.
 * Handles massive batch recalculations while actively throttling API requests
 * to avoid triggering external LLM 429 Rate Limits.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SemanticReindexingService {

    private final MediaRecommendationFacade mediaRecommendationFacade;
    private final EmbeddingProviderService embeddingProviderService;
    private final SemanticPayloadExtractor payloadExtractor;

    private static final int BATCH_SIZE = 50;
    private static final long THROTTLE_MS = 250L; // Polite delay between requests

    /**
     * Executes asynchronously to free the HTTP thread instantly.
     */
    @Async
    public void executeReindexingJob(ReindexRequestDto request) {
        log.info("Starting background Semantic Re-indexing Job. Target ALL: {}", request.all());

        if (request.all()) {
            reindexEntirePlatform();
        } else {
            processBatch(mediaRecommendationFacade.getExistingTrackIds(request.trackIds()));
        }

        log.info("Semantic Re-indexing Job complete.");
    }

    private void reindexEntirePlatform() {
        int page = 0;
        Slice<UUID> trackIdSlice;
        do {
            trackIdSlice = mediaRecommendationFacade.getTrackIdsForRecommendationIndexing(PageRequest.of(page, BATCH_SIZE));
            processBatch(trackIdSlice.getContent());
            page++;
        } while (trackIdSlice.hasNext());
    }

    private void processBatch(List<UUID> trackIds) {
        for (UUID trackId : trackIds) {
            try {
                mediaRecommendationFacade.getTrackSemanticMetadata(trackId).ifPresent(meta -> {
                    String payload = payloadExtractor.extract(meta);
                    float[] vector = embeddingProviderService.generateEmbedding(payload);
                    mediaRecommendationFacade.updateTrackVector(trackId, vector);
                });
                Thread.sleep(THROTTLE_MS);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Failed to re-index track {}: {}", trackId, e.getMessage());
            }
        }
    }
}