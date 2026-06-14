package com.indiestream.recommendation.controller;
import com.indiestream.recommendation.event.TrackNotInterestedEvent;
import com.indiestream.recommendation.service.VectorMathService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationInteractionController {

    private final ApplicationEventPublisher eventPublisher;
    private final VectorMathService vectorMathService;

    /**
     * Explicit negative interaction API.
     * Fires event to shift Taste Vector away and logs the item in user_blacklists.
     */
    @PostMapping("/interactions/not-interested/{trackId}")
    public ResponseEntity<Void> markNotInterested(
            @PathVariable UUID trackId,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        eventPublisher.publishEvent(new TrackNotInterestedEvent(userId, trackId, Instant.now()));
        return ResponseEntity.accepted().build();
    }

    /**
     * Danger Zone: Completely resets the user's algorithm, returning them to Cold Start state.
     */
    @DeleteMapping("/taste/reset")
    public ResponseEntity<Void> resetTasteProfile(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        vectorMathService.resetTasteProfile(userId);
        return ResponseEntity.noContent().build();
    }
}