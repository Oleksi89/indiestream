package com.indiestream.media.pipeline.service;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.repository.TrackRepository;
import com.indiestream.media.pipeline.dto.ReindexRequestDto;
import com.indiestream.recommendation.api.RecommendationModuleApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    private final TrackRepository trackRepository;
    private final RecommendationModuleApi recommendationModuleApi;
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
            reindexSpecificTracks(request.trackIds());
        }

        log.info("Semantic Re-indexing Job complete.");
    }

    private void reindexEntirePlatform() {
        int page = 0;
        Page<Track> trackPage;

        do {
            trackPage = trackRepository.findAll(PageRequest.of(page, BATCH_SIZE));
            log.info("Processing Re-index Batch {}/{}", page + 1, trackPage.getTotalPages());

            processBatch(trackPage.getContent());
            page++;

        } while (trackPage.hasNext());
    }

    private void reindexSpecificTracks(List<UUID> trackIds) {
        List<Track> tracks = trackRepository.findAllById(trackIds);
        processBatch(tracks);
    }

    private void processBatch(List<Track> tracks) {
        for (Track track : tracks) {
            try {
                String payload = payloadExtractor.extract(track);
                float[] vector = recommendationModuleApi.generateTextEmbedding(payload);

                trackRepository.updateTrackVector(track.getId(), vector);
                log.debug("Successfully re-indexed track: {}", track.getId());

                // Strict LLM Rate Limit Prevention Guard
                Thread.sleep(THROTTLE_MS);

            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.warn("Re-indexing job was interrupted.");
                break;
            } catch (Exception e) {
                log.error("Failed to re-index track {}: {}", track.getId(), e.getMessage());
                // Circuit Breaker inside RecommendationModuleApi will eventually catch sustained failures.
            }
        }
    }
}