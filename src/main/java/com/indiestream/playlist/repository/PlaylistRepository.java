package com.indiestream.playlist.repository;

import com.indiestream.playlist.PlaylistLibraryProjection;
import com.indiestream.playlist.domain.Playlist;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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


    /**
     * Fetches a user's library combining owned, followed, and collaborated playlists.
     * Strictly excludes followed playlists if they have been made private (isPublic = false),
     * UNLESS the user is an active collaborator on that private playlist.
     */
    @Query("""
        SELECT DISTINCT p FROM Playlist p
        LEFT JOIN PlaylistFollower pf ON pf.id.playlistId = p.id AND pf.id.userId = :userId
        LEFT JOIN PlaylistCollaborator pc ON pc.id.playlistId = p.id AND pc.id.userId = :userId
        WHERE p.ownerId = :userId
           OR (pf.id.userId = :userId AND p.isPublic = true)
           OR (pc.id.userId = :userId)
        ORDER BY p.updatedAt DESC
    """)
    Page<Playlist> findUserLibraryWithVisibilityGuards(@Param("userId") UUID userId, Pageable pageable);


    @Query("SELECT p FROM Playlist p WHERE p.ownerId = :ownerId AND p.isPublic = true AND p.isSystem = false ORDER BY p.createdAt DESC")
    Page<Playlist> findPublicPlaylistsByOwnerId(@Param("ownerId") UUID ownerId, Pageable pageable);

    @Query("SELECT p FROM Playlist p WHERE p.ownerId = :ownerId AND p.isSystem = false ORDER BY p.createdAt DESC")
    Page<Playlist> findAllPlaylistsByOwnerId(@Param("ownerId") UUID ownerId, Pageable pageable);

    /**
     * Strict JPQL projection. Bypasses standard Entity lifecycle and tracking entirely.
     */
    @Query("SELECT new com.indiestream.playlist.PlaylistLibraryProjection(p.id, p.name, p.coverMinioPath, p.ownerId, p.createdAt) " +
            "FROM Playlist p WHERE p.ownerId = :ownerId")
    List<PlaylistLibraryProjection> findOwnedPlaylistsForLibrary(@Param("ownerId") UUID ownerId);
}