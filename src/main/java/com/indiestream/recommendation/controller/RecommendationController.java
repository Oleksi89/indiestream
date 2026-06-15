package com.indiestream.recommendation.controller;

import com.indiestream.media.api.TrackMetadata;
import com.indiestream.recommendation.dto.AutoplayMode;
import com.indiestream.recommendation.dto.DiscoveryShelvesDto;
import com.indiestream.recommendation.service.RecommendationQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Public REST API for fetching AI-driven recommendations.
 */
@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationQueryService recommendationQueryService;

    /**
     * Provides continuous playback tracks when the user's queue ends.
     *
     * @param mode      "PLAYLIST" or "TASTE".
     * @param contextId If mode=PLAYLIST, the UUID of the currently playing playlist.
     */
    @GetMapping("/autoplay")
    public ResponseEntity<List<TrackMetadata>> getAutoplayQueue(
            Principal principal,
            @RequestParam AutoplayMode mode,
            @RequestParam(required = false) UUID contextId) {

        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(recommendationQueryService.getAutoplayQueue(userId, mode, contextId));
    }

    /**
     * Resolves the multi-lane dashboard Discovery Shelves.
     * Returns 400 Bad Request if the user vector is NULL, prompting the frontend to redirect to Onboarding.
     */
    @GetMapping("/shelves")
    public ResponseEntity<DiscoveryShelvesDto> getDiscoveryShelves(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());

        try {
            return ResponseEntity.ok(recommendationQueryService.getDiscoveryShelves(userId));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Resolves the initial "Cold Start" feed based on explicitly chosen genres.
     *
     * @param genres Comma-separated list of genres (e.g., "Rock,Pop,Jazz")
     */
    @GetMapping("/onboarding")
    public ResponseEntity<List<TrackMetadata>> getOnboardingFeed(
            @RequestParam List<String> genres) {

        return ResponseEntity.ok(recommendationQueryService.getOnboardingTracks(genres));
    }
}