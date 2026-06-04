package com.indiestream.media.controller;

import com.indiestream.media.dto.AppealRequest;
import com.indiestream.media.dto.TrackResolutionRequest;
import com.indiestream.media.service.ArtistTrackResolutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST Endpoint for Artist-driven moderation resolutions (Human-in-the-Loop).
 * Exposes secure actions for accepting AI metadata, proposing overrides, or appealing bans.
 */
@RestController
@RequestMapping("/api/v1/tracks/{id}/resolution")
@RequiredArgsConstructor
public class TrackResolutionController {

    private final ArtistTrackResolutionService resolutionService;

    /**
     * Artist accepts the AI's semantic tag suggestions.
     * Transitions track from NEEDS_REVISION directly to APPROVED.
     */
    @PostMapping("/accept-ai")
    public ResponseEntity<Void> acceptAiTags(
            @PathVariable("id") UUID trackId,
            Authentication authentication) {

        UUID artistId = UUID.fromString(authentication.getName());
        resolutionService.acceptAiTags(trackId, artistId);

        return ResponseEntity.noContent().build();
    }

    /**
     * Artist rejects AI suggestions and submits their own tags with justification.
     * Transitions track to IN_REVIEW for Admin assessment.
     */
    @PostMapping("/propose-tags")
    public ResponseEntity<Void> proposeCustomTags(
            @PathVariable("id") UUID trackId,
            @Valid @RequestBody TrackResolutionRequest request,
            Authentication authentication) {

        UUID artistId = UUID.fromString(authentication.getName());
        resolutionService.proposeCustomTags(trackId, artistId, request);

        return ResponseEntity.noContent().build();
    }

    /**
     * Artist appeals a REJECTED or BANNED decision.
     * Protected by strict single-appeal limits and AI confidence guards.
     */
    @PostMapping("/appeal")
    public ResponseEntity<Void> appealBan(
            @PathVariable("id") UUID trackId,
            @Valid @RequestBody AppealRequest request,
            Authentication authentication) {

        UUID artistId = UUID.fromString(authentication.getName());
        resolutionService.appealBan(trackId, artistId, request);

        return ResponseEntity.noContent().build();
    }
}