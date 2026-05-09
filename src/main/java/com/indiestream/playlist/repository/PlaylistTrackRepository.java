package com.indiestream.playlist.repository;

import com.indiestream.playlist.domain.PlaylistTrack;
import com.indiestream.playlist.domain.PlaylistTrackId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlaylistTrackRepository extends JpaRepository<PlaylistTrack, PlaylistTrackId> {

    @Query("SELECT COALESCE(MAX(pt.positionIndex), -1) FROM PlaylistTrack pt WHERE pt.id.playlistId = :playlistId")
    Integer findMaxPositionIndexByPlaylistId(@Param("playlistId") UUID playlistId);

    // Required for Deep Copy functionality
    List<PlaylistTrack> findAllByIdPlaylistId(UUID playlistId);
}