package com.indiestream.playlist.worker;

import com.indiestream.playlist.event.TrackAddedToPlaylistEvent;
import com.indiestream.playlist.event.TrackRemovedFromPlaylistEvent;
import com.indiestream.playlist.repository.PlaylistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

/**
 * Asynchronous event listener responsible for recalculating the Playlist Centroid.
 * Runs STRICTLY after the original transaction commits to ensure the 'playlist_tracks' mapping table
 * is fully updated in PostgreSQL before the native AVG(vector) query executes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlaylistCentroidWorker {

    private final PlaylistRepository playlistRepository;

    /**
     * Triggers when a track is added to a playlist.
     * Uses REQUIRES_NEW propagation because the AFTER_COMMIT phase operates outside the original transaction.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTrackAdded(TrackAddedToPlaylistEvent event) {
        log.debug("Track {} added to Playlist {}. Triggering centroid recalculation.", event.trackId(), event.playlistId());
        executeMathematicalRecalculation(event.playlistId());
    }

    /**
     * Triggers when a track is explicitly removed from a playlist.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTrackRemoved(TrackRemovedFromPlaylistEvent event) {
        log.debug("Track {} removed from Playlist {}. Triggering centroid recalculation.", event.trackId(), event.playlistId());
        executeMathematicalRecalculation(event.playlistId());
    }

    private void executeMathematicalRecalculation(UUID playlistId) {
        try {
            long startTime = System.currentTimeMillis();
            playlistRepository.recalculateCentroidVector(playlistId);
            long duration = System.currentTimeMillis() - startTime;

            log.info("Successfully recalculated Centroid Vector for Playlist: {} in {}ms", playlistId, duration);
        } catch (Exception e) {
            // Catching exceptions prevents the @Async thread from silently dying.
            // A failure here does not break the core app, but degrades AI recommendations.
            log.error("Failed to execute native pgvector centroid calculation for Playlist {}: {}", playlistId, e.getMessage(), e);
        }
    }
}