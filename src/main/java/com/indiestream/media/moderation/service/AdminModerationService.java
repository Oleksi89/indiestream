package com.indiestream.media.moderation.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.moderation.dto.AdminTrackDetailsDto;
import com.indiestream.media.moderation.dto.ModerationQueueProjection;
import com.indiestream.media.moderation.dto.ModerationVerdictRequest;
import com.indiestream.media.moderation.exception.InvalidTrackStateException;
import com.indiestream.media.moderation.repository.TrackAuditLogRepository;
import com.indiestream.media.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Service orchestrating the Admin-facing moderation workflows.
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
                .map(log -> log.getAiPayload())
                .orElse(null);

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
                .build();
    }

    /**
     * Executes the final, deterministic moderation verdict.
     * Clears buffer fields upon approval and forces FSM transitions.
     */
    @Transactional
    public void executeVerdict(UUID trackId, ModerationVerdictRequest request, UUID adminId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        if (track.getStatus() != TrackStatus.IN_REVIEW) {
            throw new InvalidTrackStateException("Only tracks in IN_REVIEW state can be adjudicated by administrators.");
        }

        log.info("Admin {} executing verdict {} for track {}", adminId, request.verdict(), trackId);

        switch (request.verdict()) {
            case APPROVE -> {
                if (request.finalTags() == null) {
                    throw new IllegalArgumentException("finalTags must be provided when approving a track.");
                }

                // 1. Commit the final tags to the public domain
                track.setTags(request.finalTags());

                // 2. Clear staging/buffer fields
                track.setArtistProposedTags(null);

                trackRepository.save(track);
                transitionEngine.transitionTrack(trackId, TrackStatus.APPROVED, "Admin Approval: " + request.reason(), null);
            }
            case REJECT -> {
                transitionEngine.transitionTrack(trackId, TrackStatus.REJECTED, "Admin Rejection: " + request.reason(), null);
            }
            case BAN -> {
                transitionEngine.transitionTrack(trackId, TrackStatus.BANNED, "Admin Ban: " + request.reason(), null);
            }
        }
    }
}