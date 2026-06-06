package com.indiestream.media.moderation.service;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.moderation.domain.TrackAuditLog;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.moderation.exception.InvalidTrackStateException;
import com.indiestream.media.moderation.repository.TrackAuditLogRepository;
import com.indiestream.media.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Core Finite State Machine (FSM) controller for Track lifecycle.
 * Enforces transition constraints and guarantees immutable audit logging.
 */
@Service
@RequiredArgsConstructor
public class TrackTransitionEngine {

    private final TrackRepository trackRepository;
    private final TrackAuditLogRepository auditLogRepository;

    // Strict constraints: Transitions that structurally require administrative or system reasoning
    private static final Set<TrackStatus> REASON_REQUIRED_STATES = Set.of(
            TrackStatus.REJECTED,
            TrackStatus.BANNED,
            TrackStatus.NEEDS_REVISION,
            TrackStatus.ARCHIVED,
            TrackStatus.HIDDEN
    );

    /**
     * Executes a state transition for a track, validating FSM rules and persisting an audit log.
     *
     * @param trackId      Target track ID.
     * @param targetStatus The desired next state.
     * @param reason       Optional explanation (mandatory for REASON_REQUIRED_STATES).
     * @param aiPayload    Optional structured metadata from AI analysis pipelines.
     */
    @Transactional
    public void transitionTrack(UUID trackId, TrackStatus targetStatus, String reason, Map<String, Object> aiPayload) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        TrackStatus currentStatus = track.getStatus();

        // Validate the FSM Matrix
        if (!currentStatus.isValidTransition(targetStatus)) {
            throw new InvalidTrackStateException(
                    String.format("Strict FSM violation: Cannot transition track %s from %s to %s",
                            trackId, currentStatus, targetStatus)
            );
        }

        // Validate reason mandatory
        if (REASON_REQUIRED_STATES.contains(targetStatus) && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException(
                    String.format("A valid reason must be provided when moving a track to %s state", targetStatus)
            );
        }

        // Resolve Execution Context (User or System)
        UUID actorId = resolveCurrentActorId();

        TrackAuditLog auditLog = TrackAuditLog.builder()
                .trackId(trackId)
                .actorId(actorId)
                .previousStatus(currentStatus)
                .newStatus(targetStatus)
                .reason(reason)
                .aiPayload(aiPayload)
                .build();

        // Mutate aggregate and save
        track.setStatus(targetStatus);

        trackRepository.save(track);
        auditLogRepository.save(auditLog);
    }

    /**
     * Retrieves the chronological audit trail for a track.
     * Enforces strict tenancy ownership: restricted to the track's creator or Admins.
     */
    @Transactional(readOnly = true)
    public List<TrackAuditLog> getAuditHistory(UUID trackId, UUID currentUserId, boolean isAdmin) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        if (!track.getArtistId().equals(currentUserId) && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to view the audit logs for this asset.");
        }

        return auditLogRepository.findAllByTrackIdOrderByCreatedAtDesc(trackId);
    }

    /**
     * Extracts the user UUID from the Spring Security context.
     */
    private UUID resolveCurrentActorId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }

        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}