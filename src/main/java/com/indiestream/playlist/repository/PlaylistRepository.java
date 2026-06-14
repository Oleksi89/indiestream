package com.indiestream.playlist.repository;

import com.indiestream.playlist.PlaylistLibraryProjection;
import com.indiestream.playlist.domain.Playlist;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
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
    @Query("SELECT new com.indiestream.playlist.PlaylistLibraryProjection(p.id, p.name, p.coverMinioPath, p.ownerId, p.createdAt, p.isCollaborative) " +
            "FROM Playlist p WHERE p.ownerId = :ownerId")
    List<PlaylistLibraryProjection> findOwnedPlaylistsForLibrary(@Param("ownerId") UUID ownerId);

    /**
     * Global Search: Strictly enforces visibility by demanding isPublic = true and isSystem = false.
     */
    @Query("SELECT p FROM Playlist p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) AND p.isPublic = true AND p.isSystem = false ORDER BY p.followersCount DESC")
    List<Playlist> searchPublicPlaylistsByName(@Param("query") String query, Pageable pageable);

    @Modifying
    @Query("UPDATE Playlist p SET p.isPublic = false, p.isCollaborative = false WHERE p.ownerId = :ownerId")
    void enforceGlobalBanCascadingPrivacy(@Param("ownerId") UUID ownerId);

    @Modifying
    @Query(value = "UPDATE playlists SET like_count = like_count + :likes WHERE id = :id", nativeQuery = true)
    void incrementPlaylistCounters(@Param("id") UUID id, @Param("likes") int likes);

    /**
     * AI CORE: Real-time Centroid Vector recalculation.
     * Executes natively in PostgreSQL using pgvector's avg() function.
     * Bypasses the JVM completely, operating in O(1) memory space regardless of playlist size.
     * If the playlist becomes empty, AVG() inherently returns NULL, resetting it to a "Cold Start" state.
     */
    @Modifying
    @Query(value = """
            UPDATE playlists 
            SET centroid_vector = (
                SELECT avg(t.vector) 
                FROM tracks t 
                JOIN playlist_tracks pt ON t.id = pt.track_id 
                WHERE pt.playlist_id = :playlistId 
                  AND t.vector IS NOT NULL
            ) 
            WHERE id = :playlistId
            """, nativeQuery = true)
    void recalculateCentroidVector(@Param("playlistId") UUID playlistId);
}