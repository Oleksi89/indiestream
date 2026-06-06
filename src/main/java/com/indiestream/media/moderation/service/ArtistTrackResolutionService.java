package com.indiestream.media.moderation.service;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.moderation.domain.TrackAuditLog;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.moderation.dto.AppealRequest;
import com.indiestream.media.moderation.dto.TrackResolutionRequest;
import com.indiestream.media.moderation.exception.AppealNotAllowedException;
import com.indiestream.media.moderation.exception.InvalidTrackStateException;
import com.indiestream.media.moderation.repository.TrackAuditLogRepository;
import com.indiestream.media.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service orchestrating the Artist-facing Human-in-the-Loop (HITL) workflows.
 * Enforces strict ownership checks and Abuse Prevention mechanisms.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArtistTrackResolutionService {

    private final TrackRepository trackRepository;
    private final TrackAuditLogRepository auditLogRepository;
    private final TrackTransitionEngine transitionEngine;

    /**
     * Resolves a NEEDS_REVISION state by accepting the AI's suggestions implicitly.
     */
    @Transactional
    public void acceptAiTags(UUID trackId, UUID artistId) {
        Track track = getTrackAndVerifyOwnership(trackId, artistId);

        if (track.getStatus() != TrackStatus.NEEDS_REVISION) {
            throw new InvalidTrackStateException("AI tags can only be explicitly accepted when the track is in NEEDS_REVISION state.");
        }

        // Clean up any temporary buffer data since the artist agreed with the AI
        track.setArtistProposedTags(null);
        trackRepository.save(track);

        transitionEngine.transitionTrack(
                trackId,
                TrackStatus.APPROVED,
                "Artist successfully reviewed and accepted AI tagging suggestions.",
                null
        );
        log.info("Artist {} accepted AI tags for track {}", artistId, trackId);
    }

    /**
     * Resolves a NEEDS_REVISION state by rejecting AI tags and proposing custom ones.
     * Flagged for Admin review.
     */
    @Transactional
    public void proposeCustomTags(UUID trackId, UUID artistId, TrackResolutionRequest request) {
        Track track = getTrackAndVerifyOwnership(trackId, artistId);

        if (track.getStatus() != TrackStatus.NEEDS_REVISION) {
            throw new InvalidTrackStateException("Custom tags can only be proposed when the track is in NEEDS_REVISION state.");
        }

        // Isolate proposed tags in the staging field
        track.setArtistProposedTags(request.proposedTags());
        trackRepository.save(track);

        transitionEngine.transitionTrack(
                trackId,
                TrackStatus.IN_REVIEW,
                "Artist proposed custom tags over AI suggestions. Justification: " + request.justification(),
                null
        );
        log.info("Artist {} proposed custom tags for track {}", artistId, trackId);
    }

    /**
     * Submits a formal appeal against a REJECTED or BANNED status.
     * Protected by strict Abuse Prevention algorithms.
     */
    @Transactional
    public void appealBan(UUID trackId, UUID artistId, AppealRequest request) {
        Track track = getTrackAndVerifyOwnership(trackId, artistId);

        if (track.getStatus() != TrackStatus.BANNED && track.getStatus() != TrackStatus.REJECTED) {
            throw new InvalidTrackStateException("Only BANNED or REJECTED tracks are eligible for appeals.");
        }

        // Abuse Prevention Guard
        if (track.isHasAppealed()) {
            log.warn("Abuse detected: Artist {} attempted multiple appeals for track {}", artistId, trackId);
            throw new AppealNotAllowedException("This track has already exhausted its single appeal allowed by the platform.");
        }

        // AI Confidence Guard (Zero-Tolerance Policy)
        enforceAiConfidenceGuard(track);

        // Lock further appeals
        track.setHasAppealed(true);
        trackRepository.save(track);

        transitionEngine.transitionTrack(
                trackId,
                TrackStatus.IN_REVIEW,
                "Formal Artist Appeal submitted: " + request.reason(),
                null
        );
        log.info("Artist {} successfully appealed track {}", artistId, trackId);
    }

    /**
     * Strictly verifies that the authenticated user owns the aggregate root.
     */
    private Track getTrackAndVerifyOwnership(UUID trackId, UUID artistId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        if (!track.getArtistId().equals(artistId)) {
            throw new AccessDeniedException("You do not have permission to perform resolution actions on this track.");
        }
        return track;
    }

    /**
     * Interrogates the audit log. If the track was BANNED by the AI with extreme confidence,
     * human appeals are preemptively blocked to protect moderator bandwidth from obvious violations.
     */
    private void enforceAiConfidenceGuard(Track track) {
        if (track.getStatus() != TrackStatus.BANNED) {
            return; // Only strict bans fall under the zero-tolerance policy
        }

        List<TrackAuditLog> logs = auditLogRepository.findAllByTrackIdOrderByCreatedAtDesc(track.getId());
        if (logs.isEmpty()) {
            return;
        }

        TrackAuditLog latestLog = logs.get(0);
        if (latestLog.getAiPayload() != null && latestLog.getAiPayload().containsKey("confidenceScore")) {
            double confidenceScore = ((Number) latestLog.getAiPayload().get("confidenceScore")).doubleValue();

            if (confidenceScore >= 0.95) {
                throw new AppealNotAllowedException("Appeal denied automatically. The moderation engine flagged this content with extreme confidence (>= 0.95) for severe policy violations.");
            }
        }
    }
}