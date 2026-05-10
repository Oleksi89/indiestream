package com.indiestream.playlist.repository;

import com.indiestream.playlist.domain.PlaylistCollaborator;
import com.indiestream.playlist.domain.PlaylistCollaboratorId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PlaylistCollaboratorRepository extends JpaRepository<PlaylistCollaborator, PlaylistCollaboratorId> {
    boolean existsByIdPlaylistIdAndIdUserId(UUID playlistId, UUID userId);
}