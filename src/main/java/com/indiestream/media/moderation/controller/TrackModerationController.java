package com.indiestream.media.moderation.controller;

import com.indiestream.media.moderation.domain.TrackAuditLog;
import com.indiestream.media.moderation.dto.TrackAuditLogDto;
import com.indiestream.media.moderation.dto.TrackStatusTransitionRequest;
import com.indiestream.media.moderation.service.TrackTransitionEngine;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Endpoint for track lifecycle mutations, moderation overrides, and audit log exploration.
 * Strictly delegates domain access to the Service layer to maintain clean architecture.
 */
@RestController
@RequestMapping("/api/v1/tracks")
@RequiredArgsConstructor
public class TrackModerationController {

    private final TrackTransitionEngine transitionEngine;

    /**
     * Executes an explicit state change on a track.
     * Enforces security context isolation to guarantee actors can only perform allowed movements.
     */
    @PostMapping("/{id}/status")
    public ResponseEntity<Void> updateTrackStatus(
            @PathVariable("id") UUID trackId,
            @Valid @RequestBody TrackStatusTransitionRequest request) {

        // FSM Verification, Security Logging, and Persistence execution inside the engine boundary
        transitionEngine.transitionTrack(trackId, request.targetStatus(), request.reason(), request.aiPayload());
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieves the chronological audit trail for a track.
     * Access control: Restricted to the track's creator (Artist) or accounts with Admin privileges.
     */
    @GetMapping("/{id}/audit")
    public ResponseEntity<List<TrackAuditLogDto>> getTrackAuditHistory(
            @PathVariable("id") UUID trackId,
            Authentication authentication) {

        UUID currentUserId = UUID.fromString(authentication.getName());
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ADMIN"));

        List<TrackAuditLogDto> auditTrail = transitionEngine.getAuditHistory(trackId, currentUserId, isAdmin)
                .stream()
                .map(this::mapToDto)
                .toList();

        return ResponseEntity.ok(auditTrail);
    }

    private TrackAuditLogDto mapToDto(TrackAuditLog log) {
        return new TrackAuditLogDto(
                log.getId(),
                log.getTrackId(),
                log.getActorId(),
                log.getPreviousStatus(),
                log.getNewStatus(),
                log.getReason(),
                log.getAiPayload(),
                log.getCreatedAt()
        );
    }
}