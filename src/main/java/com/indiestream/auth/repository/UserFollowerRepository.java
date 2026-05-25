package com.indiestream.auth.repository;

import com.indiestream.auth.domain.UserFollower;
import com.indiestream.auth.domain.UserFollowerId;
import com.indiestream.auth.FollowedUserProfileProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserFollowerRepository extends JpaRepository<UserFollower, UserFollowerId> {
    boolean existsByIdFollowerIdAndIdFollowedId(UUID followerId, UUID followedId);

    /**
     * Executes a strict JOIN projection. Ignores heavy User metadata (like passwords/roles)
     * and fetches only the display data required by the BFF orchestrator.
     */
    @Query("SELECT new com.indiestream.auth.FollowedUserProfileProjection(u.id, u.alias, u.username, p.avatarPath, uf.createdAt) " +
            "FROM UserFollower uf " +
            "JOIN User u ON uf.id.followedId = u.id " +
            "LEFT JOIN UserProfile p ON u.id = p.userId " +
            "WHERE uf.id.followerId = :followerId")
    List<FollowedUserProfileProjection> findFollowedProfilesForLibrary(@Param("followerId") UUID followerId);
}