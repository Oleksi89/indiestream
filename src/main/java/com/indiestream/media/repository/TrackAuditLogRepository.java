package com.indiestream.media.repository;

import com.indiestream.media.domain.TrackAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrackAuditLogRepository extends JpaRepository<TrackAuditLog, UUID> {

    /**
     * Retrieves the chronological audit history for a specific track.
     * Used for moderation review and artist transparency features.
     */
    List<TrackAuditLog> findAllByTrackIdOrderByCreatedAtDesc(UUID trackId);

    /**
     * Retrieves the most recent audit log for a track that contains an AI payload.
     * Crucial for the Admin review dashboard.
     */
    Optional<TrackAuditLog> findFirstByTrackIdAndAiPayloadIsNotNullOrderByCreatedAtDesc(UUID trackId);
}