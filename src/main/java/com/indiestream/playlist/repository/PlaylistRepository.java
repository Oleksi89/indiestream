package com.indiestream.playlist.repository;

import com.indiestream.playlist.domain.Playlist;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {

    // Identifies the unique system playlist for a specific user
    Optional<Playlist> findByOwnerIdAndIsSystemTrue(UUID ownerId);

    /**
     * Secures the playlist row with a database-level lock (SELECT FOR UPDATE).
     * Prevents race conditions when multiple concurrent users add tracks
     * and update the track_count/total_duration aggregates.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Playlist p WHERE p.id = :id")
    Optional<Playlist> findByIdWithPessimisticWrite(@Param("id") UUID id);
}