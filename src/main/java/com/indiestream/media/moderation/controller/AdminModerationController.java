package com.indiestream.media.moderation.controller;

import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.moderation.dto.AdminTrackDetailsDto;
import com.indiestream.media.moderation.dto.AdminTrackSummaryDto;
import com.indiestream.media.moderation.dto.ModerationQueueProjection;
import com.indiestream.media.moderation.dto.ModerationVerdictRequest;
import com.indiestream.media.moderation.service.AdminModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Global Admin Workspace endpoints.
 * Strictly protected; handles global searching, granular auditing, and cross-module bans.
 */
@RestController
@RequestMapping("/api/v1/admin/moderation/tracks")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;

    /**
     * Dynamic search endpoint for the Global Track Registry.
     */
    @GetMapping("/registry")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<AdminTrackSummaryDto>> getGlobalRegistry(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) List<TrackStatus> statuses,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @PageableDefault(size = 50) Pageable pageable) {

        Page<AdminTrackSummaryDto> registryPage = adminModerationService.getGlobalTrackRegistry(
                query, statuses, startDate, endDate, pageable);
        return ResponseEntity.ok(registryPage);
    }

    /**
     * Retrieves the global queue of tracks requiring human adjudication.
     * Uses lightweight projections to prevent memory exhaustion.
     */
    @GetMapping("/queue")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<ModerationQueueProjection>> getModerationQueue(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminModerationService.getModerationQueue(pageable));
    }

    /**
     * Retrieves aggregated, deep-dive details for a specific track under review.
     * Includes current public tags, artist's proposed override, and raw AI reasoning.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<AdminTrackDetailsDto> getTrackModerationDetails(@PathVariable("id") UUID trackId) {
        return ResponseEntity.ok(adminModerationService.getTrackModerationDetails(trackId));
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

    /**
     * Cross-Module Action: Bans the artist and aggressively suspends all their media content.
     */
    @PostMapping("/artists/{artistId}/ban")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> banArtist(
            @PathVariable("artistId") UUID artistId,
            @RequestParam String reason,
            Authentication authentication) {

        UUID adminId = UUID.fromString(authentication.getName());
        adminModerationService.banArtist(artistId, reason, adminId);
        return ResponseEntity.noContent().build();
    }


    /**
     * Cross-Module Action: UnBans the artist.
     */
    @PostMapping("/artists/{artistId}/unban")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> unbanArtist(
            @PathVariable("artistId") UUID artistId,
            @RequestParam String reason,
            Authentication authentication) {

        UUID adminId = UUID.fromString(authentication.getName());
        adminModerationService.unbanArtist(artistId, reason, adminId);
        return ResponseEntity.noContent().build();
    }
}