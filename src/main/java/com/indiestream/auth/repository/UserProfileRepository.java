package com.indiestream.auth.repository;

import com.indiestream.auth.domain.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

    @Modifying
    @Query("UPDATE UserProfile p SET p.followersCount = p.followersCount + 1 WHERE p.userId = :userId")
    void incrementFollowersCount(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE UserProfile p SET p.followersCount = p.followersCount - 1 WHERE p.userId = :userId AND p.followersCount > 0")
    void decrementFollowersCount(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE UserProfile p SET p.followingCount = p.followingCount + 1 WHERE p.userId = :userId")
    void incrementFollowingCount(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE UserProfile p SET p.followingCount = p.followingCount - 1 WHERE p.userId = :userId AND p.followingCount > 0")
    void decrementFollowingCount(@Param("userId") UUID userId);
}