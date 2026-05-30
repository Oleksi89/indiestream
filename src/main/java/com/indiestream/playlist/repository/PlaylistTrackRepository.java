package com.indiestream.playlist.repository;

import com.indiestream.playlist.domain.PlaylistTrack;
import com.indiestream.playlist.domain.PlaylistTrackId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlaylistTrackRepository extends JpaRepository<PlaylistTrack, PlaylistTrackId> {

    // Paginated fetch ordered by manual position
    Page<PlaylistTrack> findAllByIdPlaylistIdOrderByPositionIndexAsc(UUID playlistId, Pageable pageable);

    @Query("SELECT COALESCE(MAX(pt.positionIndex), -1) FROM PlaylistTrack pt WHERE pt.id.playlistId = :playlistId")
    Integer findMaxPositionIndexByPlaylistId(@Param("playlistId") UUID playlistId);

    // Required for Deep Copy functionality
    List<PlaylistTrack> findAllByIdPlaylistId(UUID playlistId);

    /**
     * High-performance Native SQL batch insert for the Deep Copy operation.
     * Prevents OOM errors and N+1 insert bottlenecks when copying massive playlists.
     * Directly streams data from the source playlist to the target playlist.
     */
    @Modifying
    @Query(value = """
        INSERT INTO playlist_tracks (playlist_id, track_id, added_by_id, position_index, added_at)
        SELECT :newPlaylistId, pt.track_id, :newOwnerId, pt.position_index, CURRENT_TIMESTAMP
        FROM playlist_tracks pt
        WHERE pt.playlist_id = :sourcePlaylistId
    """, nativeQuery = true)
    void cloneTracksBulk(@Param("sourcePlaylistId") UUID sourcePlaylistId,
                         @Param("newPlaylistId") UUID newPlaylistId,
                         @Param("newOwnerId") UUID newOwnerId);
}