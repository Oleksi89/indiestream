package com.indiestream.auth.repository;

import com.indiestream.auth.domain.UserFollower;
import com.indiestream.auth.domain.UserFollowerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserFollowerRepository extends JpaRepository<UserFollower, UserFollowerId> {
    boolean existsByIdFollowerIdAndIdFollowedId(UUID followerId, UUID followedId);
}