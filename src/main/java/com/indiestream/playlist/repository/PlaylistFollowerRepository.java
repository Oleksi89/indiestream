package com.indiestream.playlist.repository;

import com.indiestream.playlist.PlaylistLibraryProjection;
import com.indiestream.playlist.domain.PlaylistFollower;
import com.indiestream.playlist.domain.PlaylistFollowerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlaylistFollowerRepository extends JpaRepository<PlaylistFollower, PlaylistFollowerId> {

    @Query("SELECT new com.indiestream.playlist.PlaylistLibraryProjection(p.id, p.name, p.coverMinioPath, p.ownerId, pf.followedAt) " +
            "FROM PlaylistFollower pf JOIN Playlist p ON pf.id.playlistId = p.id " +
            "WHERE pf.id.userId = :userId AND p.isPublic = true")
    List<PlaylistLibraryProjection> findFollowedPlaylistsForLibrary(@Param("userId") UUID userId);

    /**
     * For data consistency checks or validation logic outside the DTO mapping flow.
     */
    int countByIdPlaylistId(UUID playlistId);
}