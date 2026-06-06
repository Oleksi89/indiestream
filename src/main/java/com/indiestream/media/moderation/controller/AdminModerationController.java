package com.indiestream.media.moderation.controller;

import com.indiestream.media.moderation.dto.AdminTrackDetailsDto;
import com.indiestream.media.moderation.dto.ModerationQueueProjection;
import com.indiestream.media.moderation.dto.ModerationVerdictRequest;
import com.indiestream.media.moderation.service.AdminModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST Endpoint for Administrative moderation actions.
 * Strictly protected; relies on CQRS patterns to efficiently deliver data to the Admin Dashboard.
 */
@RestController
@RequestMapping("/api/v1/admin/moderation/tracks")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;

    /**
     * Retrieves the global queue of tracks requiring human adjudication.
     * Uses lightweight projections to prevent memory exhaustion.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<ModerationQueueProjection>> getModerationQueue(
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ModerationQueueProjection> queue = adminModerationService.getModerationQueue(pageable);
        return ResponseEntity.ok(queue);
    }

    /**
     * Retrieves aggregated, deep-dive details for a specific track under review.
     * Includes current public tags, artist's proposed override, and raw AI reasoning.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<AdminTrackDetailsDto> getTrackModerationDetails(
            @PathVariable("id") UUID trackId) {

        AdminTrackDetailsDto details = adminModerationService.getTrackModerationDetails(trackId);
        return ResponseEntity.ok(details);
    }

    /**
     * Executes the final deterministic moderation verdict (APPROVE, REJECT, BAN).
     * Clears buffer data and commits final tags upon approval.
     */
    @PostMapping("/{id}/verdict")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> executeVerdict(
            @PathVariable("id") UUID trackId,
            @Valid @RequestBody ModerationVerdictRequest request,
            Authentication authentication) {

        UUID adminId = UUID.fromString(authentication.getName());
        adminModerationService.executeVerdict(trackId, request, adminId);

        return ResponseEntity.noContent().build();
    }
}