package com.indiestream.media.service;

import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
import com.indiestream.media.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service dedicated to Artist-driven lifecycle workflows (Publish, Hide, Archive).
 * Strictly isolated from playback and ingestion concerns to maintain SRP.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArtistTrackManagementService {

    private final TrackRepository trackRepository;
    private final TrackTransitionEngine transitionEngine;

    /**
     * Publishes an APPROVED or READY track to the public feed.
     */
    @Transactional
    public void publishTrack(UUID trackId, UUID artistId) {
        Track track = getTrackAndVerifyOwnership(trackId, artistId);

        transitionEngine.transitionTrack(
                trackId,
                TrackStatus.PUBLISHED,
                "Artist formally published the track to the global feed.",
                null
        );
        log.info("Artist {} successfully published track {}", artistId, trackId);
    }

    /**
     * Toggles visibility between PUBLISHED and HIDDEN.
     * Prevents modifying tracks that are currently under review or banned.
     */
    @Transactional
    public void toggleTrackVisibility(UUID trackId, UUID artistId) {
        Track track = getTrackAndVerifyOwnership(trackId, artistId);

        TrackStatus nextStatus = (track.getStatus() == TrackStatus.HIDDEN)
                ? TrackStatus.PUBLISHED
                : TrackStatus.HIDDEN;

        String reason = (nextStatus == TrackStatus.HIDDEN)
                ? "Artist temporarily hid the track from public view."
                : "Artist restored track visibility.";

        transitionEngine.transitionTrack(trackId, nextStatus, reason, null);
        log.info("Artist {} toggled visibility of track {} to {}", artistId, trackId, nextStatus);
    }

    /**
     * Executes a Soft Delete. Moves track to the terminal ARCHIVED state.
     * Preserves MinIO blobs and audit logs for compliance, removing the track from the dashboard and feed.
     */
    @Transactional
    public void archiveTrack(UUID trackId, UUID artistId) {
        Track track = getTrackAndVerifyOwnership(trackId, artistId);

        transitionEngine.transitionTrack(
                trackId,
                TrackStatus.ARCHIVED,
                "Artist executed a soft-delete (ARCHIVED). Removed from dashboard and public feeds.",
                null
        );
        log.info("Artist {} archived track {}", artistId, trackId);
    }

    /**
     * Core security guard. Ensures the JWT owner is the actual track owner.
     */
    private Track getTrackAndVerifyOwnership(UUID trackId, UUID artistId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        if (!track.getArtistId().equals(artistId)) {
            log.warn("Security Event: User {} attempted to manage track {} owned by {}",
                    artistId, trackId, track.getArtistId());
            throw new AccessDeniedException("You do not have permission to manage this track.");
        }
        return track;
    }
}