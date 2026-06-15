package com.indiestream.recommendation.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.playlist.PlaylistDto;
import com.indiestream.playlist.PlaylistModuleApi;
import com.indiestream.playlist.api.PlaylistRecommendationFacade;
import com.indiestream.recommendation.dto.AutoplayMode;
import com.indiestream.recommendation.dto.DiscoveryShelvesDto;
import com.indiestream.recommendation.repository.RecommendationQueryEngine;
import com.indiestream.telemetry.api.TelemetryModuleApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Orchestrates cross-module AI recommendations.
 * Fetches optimal UUIDs via pgvector, applies anti-fatigue and mathematical jitter,
 * and hydrates the results utilizing strict public API boundaries.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationQueryService {

    private final RecommendationQueryEngine queryEngine;
    private final AuthModuleApi authModuleApi;
    private final MediaModuleApi mediaModuleApi;
    private final PlaylistModuleApi playlistModuleApi;
    private final TelemetryModuleApi telemetryModuleApi;
    private final PlaylistRecommendationFacade playlistRecommendationFacade;

    private static final int ANTI_FATIGUE_DAYS = 7;
    private static final int OVERSAMPLE_POOL_SIZE = 50;
    private static final int TARGET_RESULT_SIZE = 20;
    private static final int SHELF_SIZE = 10;

    /**
     * Continuous Playback Engine.
     * Generates a fresh queue of highly relevant tracks based on context.
     */
    public List<TrackMetadata> getAutoplayQueue(UUID userId, AutoplayMode mode, UUID contextId) {
        float[] targetVector = determineTargetVector(userId, mode, contextId);

        if (targetVector == null) {
            log.warn("Target vector is null. Falling back to generic popular tracks.");
            return getColdStartFallback();
        }

        // 1. Fetch recently listened tracks to exclude (Anti-Fatigue)
        List<UUID> fatiguedIds = telemetryModuleApi.getRecentTrackIds(userId, ANTI_FATIGUE_DAYS);

        // 2. Execute mathematical pgvector search (Oversampled)
        List<UUID> candidateIds = queryEngine.findClosestTracks(userId, targetVector, fatiguedIds, OVERSAMPLE_POOL_SIZE);

        // 3. Apply Jitter and slice down to target size
        List<UUID> finalIds = applyMathematicalJitter(candidateIds, TARGET_RESULT_SIZE);

        // 4. Resolve UUIDs to rich DTOs preserving the modified AI ranking order
        return mediaModuleApi.getPublicTracksMetadata(finalIds);
    }

    /**
     * Aggregates the multi-lane dashboard interface.
     */
    public DiscoveryShelvesDto getDiscoveryShelves(UUID userId) {
        float[] tasteVector = authModuleApi.getTasteVector(userId);

        if (tasteVector == null) {
            throw new IllegalStateException("User requires Onboarding. Taste Profile is NULL.");
        }

        List<UUID> fatiguedIds = telemetryModuleApi.getRecentTrackIds(userId, ANTI_FATIGUE_DAYS);

        // Shelf 1: Made For You (Tracks)
        List<UUID> madeForYouIds = applyMathematicalJitter(
                queryEngine.findClosestTracks(userId, tasteVector, fatiguedIds, OVERSAMPLE_POOL_SIZE),
                SHELF_SIZE
        );
        List<TrackMetadata> madeForYou = mediaModuleApi.getPublicTracksMetadata(madeForYouIds);

        // Shelf 2: Discover Playlists
        List<UUID> playlistIds = queryEngine.findClosestPlaylists(userId, tasteVector, SHELF_SIZE);
        List<PlaylistDto> discoverPlaylists = playlistModuleApi.getPlaylistsByIds(playlistIds);

        // Shelf 3: Listeners Like You (Collaborative Filtering)
        List<UUID> collabIds = queryEngine.findTracksFromSimilarUsers(userId, tasteVector, SHELF_SIZE);
        List<TrackMetadata> listenersLikeYou = mediaModuleApi.getPublicTracksMetadata(collabIds);

        return new DiscoveryShelvesDto(madeForYou, discoverPlaylists, listenersLikeYou);
    }

    /**
     * Cold Start Onboarding Resolver.
     * Searches for popular tracks matching the user's initially selected genres.
     * Relies on the Media module's native sorting (popularity_score DESC).
     */
    public List<TrackMetadata> getOnboardingTracks(List<String> genres) {
        if (genres == null || genres.isEmpty()) {
            return getColdStartFallback();
        }

        List<TrackMetadata> aggregated = new ArrayList<>();
        // Fetch top 10 from each requested genre to form a diverse initial seed
        for (String genre : genres) {
            aggregated.addAll(mediaModuleApi.searchPublicTracks(null, genre, null, PageRequest.of(0, 10)).getContent());
        }

        // Shuffle to prevent one genre from completely dominating the top of the list visually
        Collections.shuffle(aggregated);
        return aggregated.stream().limit(30).toList();
    }

    private float[] determineTargetVector(UUID userId, AutoplayMode mode, UUID contextId) {
        if (mode == AutoplayMode.PLAYLIST && contextId != null) {
            return playlistRecommendationFacade.getPlaylistCentroidVector(contextId).orElse(null);
        }
        return authModuleApi.getTasteVector(userId);
    }

    private List<TrackMetadata> getColdStartFallback() {
        return mediaModuleApi.searchPublicTracks(null, null, null, PageRequest.of(0, TARGET_RESULT_SIZE)).getContent();
    }

    /**
     * Prevents recommendation stagnation.
     * Applies a randomized mathematical perturbation (Jitter) to the perfectly ordered results.
     * Retains general proximity accuracy but ensures consecutive reloads feel "fresh".
     */
    private List<UUID> applyMathematicalJitter(List<UUID> rawCandidates, int limit) {
        if (rawCandidates == null || rawCandidates.isEmpty()) return Collections.emptyList();

        Random random = new Random();
        int maxBaseScore = rawCandidates.size();

        return rawCandidates.stream()
                .map(id -> {
                    int originalIndex = rawCandidates.indexOf(id);
                    // Base score: Higher is better (index 0 gets score 50)
                    double baseScore = maxBaseScore - originalIndex;
                    // Jitter modifier: Randomize between 0.8x and 1.2x (+/- 20% variance)
                    double jitterModifier = 0.8 + (0.4 * random.nextDouble());
                    double finalScore = baseScore * jitterModifier;
                    return new AbstractMap.SimpleEntry<>(id, finalScore);
                })
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue())) // Sort DESC by final jittered score
                .map(AbstractMap.SimpleEntry::getKey)
                .limit(limit)
                .toList();
    }
}