package com.indiestream.playlist.repository;

import com.indiestream.playlist.PlaylistLibraryProjection;
import com.indiestream.playlist.domain.PlaylistCollaborator;
import com.indiestream.playlist.domain.PlaylistCollaboratorId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlaylistCollaboratorRepository extends JpaRepository<PlaylistCollaborator, PlaylistCollaboratorId> {
    boolean existsByIdPlaylistIdAndIdUserId(UUID playlistId, UUID userId);

    List<PlaylistCollaborator> findAllByIdPlaylistId(UUID playlistId);

    @Query("SELECT new com.indiestream.playlist.PlaylistLibraryProjection(p.id, p.name, p.coverMinioPath, p.ownerId, pc.joinedAt, p.isCollaborative) " +
            "FROM PlaylistCollaborator pc JOIN Playlist p ON pc.id.playlistId = p.id " +
            "WHERE pc.id.userId = :userId")
    List<PlaylistLibraryProjection> findCollaboratedPlaylistsForLibrary(@Param("userId") UUID userId);
}