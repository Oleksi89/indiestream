package com.indiestream.media.moderation.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.event.UserBannedEvent;
import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.catalog.repository.TrackSpecification;
import com.indiestream.media.moderation.domain.TrackAuditLog;
import com.indiestream.media.moderation.dto.*;
import com.indiestream.media.moderation.exception.InvalidTrackStateException;
import com.indiestream.media.moderation.repository.TrackAuditLogRepository;
import com.indiestream.media.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service orchestrating the Admin-facing moderation workflows and Global Registry.
 * Handles the resolution of flagged content, appeals, and explicit system bans.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private final TrackRepository trackRepository;
    private final TrackAuditLogRepository auditLogRepository;
    private final TrackTransitionEngine transitionEngine;
    private final AuthModuleApi authModuleApi;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Executes a multi-parameter search across the entire track registry.
     * Integrates cross-module resolution to allow searching tracks by artist alias.
     */
    @Transactional(readOnly = true)
    public Page<AdminTrackSummaryDto> getGlobalTrackRegistry(
            String query, List<TrackStatus> statuses, Instant startDate, Instant endDate, Pageable pageable) {

        List<UUID> matchingArtistIds = new ArrayList<>();

        // If a query exists, pre-fetch artist UUIDs from Auth module to support alias-based searching
        if (query != null && !query.isBlank()) {
            Page<UserPublicProfile> profiles = authModuleApi.searchPublicProfiles(query, PageRequest.of(0, 50));
            matchingArtistIds = profiles.getContent().stream().map(UserPublicProfile::id).toList();
        }

        Specification<Track> spec = TrackSpecification.buildAdminFilter(query, matchingArtistIds, statuses, startDate, endDate);

        return trackRepository.findAll(spec, pageable).map(this::mapToSummaryDto);
    }

    // --- MODERATION ACTIONS & DETAILS ---

    /**
     * Fetches a paginated, lightweight list of tracks currently awaiting human review.
     */
    @Transactional(readOnly = true)
    public Page<ModerationQueueProjection> getModerationQueue(Pageable pageable) {
        log.debug("Fetching Admin Moderation Queue");
        return trackRepository.findAllByStatusOrderByCreatedAtAsc(TrackStatus.IN_REVIEW, pageable);
    }

    /**
     * Aggregates data needed by an Admin to make a moderation decision.
     */
    @Transactional(readOnly = true)
    public AdminTrackDetailsDto getTrackModerationDetails(UUID trackId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        // Fetch Artist details
        UserPublicProfile artistProfile = authModuleApi.getUserPublicProfile(track.getArtistId())
                .orElse(new UserPublicProfile(track.getArtistId(), "Unknown", "unknown", null));

        // Fetch the most recent AI payload to display Gemini's reasoning and confidence
        Map<String, Object> aiPayload = auditLogRepository
                .findFirstByTrackIdAndAiPayloadIsNotNullOrderByCreatedAtDesc(trackId)
                .map(TrackAuditLog::getAiPayload)
                .orElse(null);

        List<TrackAuditLogDto> auditHistory = getTrackAuditHistory(trackId);

        return AdminTrackDetailsDto.builder()
                .trackId(track.getId())
                .title(track.getTitle())
                .artistId(track.getArtistId())
                .artistAlias(artistProfile.alias())
                .artistUsername(artistProfile.username())
                .artistAvatar(artistProfile.avatarPath())
                .status(track.getStatus())
                .hasAppealed(track.isHasAppealed())
                .currentTags(track.getTags())
                .artistProposedTags(track.getArtistProposedTags())
                .aiPayload(aiPayload)
                .auditHistory(auditHistory)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TrackAuditLogDto> getTrackAuditHistory(UUID trackId) {
        return auditLogRepository.findAllByTrackIdOrderByCreatedAtDesc(trackId).stream()
                .map(log -> TrackAuditLogDto.builder()
                        .id(log.getId())
                        .trackId(log.getTrackId())
                        .actorId(log.getActorId())
                        .previousStatus(log.getPreviousStatus())
                        .newStatus(log.getNewStatus())
                        .reason(log.getReason())
                        .aiPayload(log.getAiPayload())
                        .createdAt(log.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Executes the final, deterministic moderation verdict.
     * Clears buffer fields upon approval and forces FSM transitions.
     */
    @Transactional
    public void executeVerdict(UUID trackId, ModerationVerdictRequest request, UUID adminId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        // Resolve Target State based on Administrative Action
        TrackStatus targetStatus = switch (request.verdict()) {
            case APPROVE, RESTORE -> TrackStatus.APPROVED;
            case REJECT -> TrackStatus.REJECTED;
            case BAN -> TrackStatus.BANNED;
            case FORCE_ARCHIVE -> TrackStatus.ARCHIVED;
        };

        // FSM Guard: Single Source of Truth validation
        if (!track.getStatus().isValidTransition(targetStatus)) {
            throw new InvalidTrackStateException(
                    String.format("Cannot execute %s. Invalid state transition from %s to %s.",
                            request.verdict(), track.getStatus(), targetStatus)
            );
        }

        log.info("Admin {} executing verdict {} (Transition: {} -> {}) for track {}",
                adminId, request.verdict(), track.getStatus(), targetStatus, trackId);

        // Execute Specialized State Logic
        switch (request.verdict()) {
            case APPROVE -> {
                if (request.finalTags() != null) track.setTags(request.finalTags());
                track.setArtistProposedTags(null);

                trackRepository.save(track);
                transitionEngine.transitionTrack(trackId, targetStatus, "Admin Force Approval: " + request.reason(), null);
            }
            case RESTORE ->
                    transitionEngine.transitionTrack(trackId, targetStatus, "Admin Restored Track: " + request.reason(), null);
            case REJECT ->
                    transitionEngine.transitionTrack(trackId, targetStatus, "Admin Rejection: " + request.reason(), null);
            case BAN ->
                    transitionEngine.transitionTrack(trackId, targetStatus, "Admin Suspension: " + request.reason(), null);
            case FORCE_ARCHIVE ->
                    transitionEngine.transitionTrack(trackId, targetStatus, "Admin Force Archive (Takedown): " + request.reason(), null);
        }
    }

    /**
     * Executes a cross-module artist ban.
     * Fires an event to the Auth module and aggressively sweeps and bans all active media content.
     */
    @Transactional
    public void banArtist(UUID artistId, String reason, UUID adminId) {
        log.warn("Initiating global ban for Artist ID: {} by Admin ID: {}", artistId, adminId);

        // Emit Domain Event (Auth module handles login block & token invalidation asynchronously)
        eventPublisher.publishEvent(new UserBannedEvent(artistId, adminId, reason, Instant.now()));

        // Transition all active tracks to BANNED
        List<Track> artistTracks = trackRepository.findAllByArtistId(artistId);
        int bannedCount = 0;

        for (Track track : artistTracks) {
            // Do not alter terminal states
            if (track.getStatus() != TrackStatus.BANNED && track.getStatus() != TrackStatus.ARCHIVED) {
                transitionEngine.transitionTrack(
                        track.getId(),
                        TrackStatus.BANNED,
                        "Automatic suspension due to Artist Account Ban. Reason: " + reason,
                        null
                );
                bannedCount++;
            }
        }

        log.info("Artist {} ban complete. Automatically suspended {} tracks.", artistId, bannedCount);
    }

    private AdminTrackSummaryDto mapToSummaryDto(Track track) {
        UserPublicProfile profile = authModuleApi.getUserPublicProfile(track.getArtistId()).orElse(null);
        return AdminTrackSummaryDto.builder()
                .id(track.getId())
                .artistId(track.getArtistId())
                .artistAlias(profile != null ? profile.alias() : "Unknown")
                .artistUsername(profile != null ? profile.username() : "unknown")
                .title(track.getTitle())
                .status(track.getStatus())
                .createdAt(track.getCreatedAt())
                .build();
    }
}