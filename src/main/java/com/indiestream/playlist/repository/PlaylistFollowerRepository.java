package com.indiestream.playlist.repository;

import com.indiestream.playlist.domain.PlaylistFollower;
import com.indiestream.playlist.domain.PlaylistFollowerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlaylistFollowerRepository extends JpaRepository<PlaylistFollower, PlaylistFollowerId> {
}