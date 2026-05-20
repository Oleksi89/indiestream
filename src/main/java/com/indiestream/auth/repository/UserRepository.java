package com.indiestream.auth.repository;

import com.indiestream.auth.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    /**
     * Resolves followers while preventing N+1 queries for user profiles.
     */
    @EntityGraph(attributePaths = {"profile"})
    @Query("SELECT u FROM User u JOIN UserFollower uf ON u.id = uf.id.followerId WHERE uf.id.followedId = :followedId")
    Page<User> findFollowersByFollowedId(@Param("followedId") UUID followedId, Pageable pageable);

    /**
     * Resolves following targets while preventing N+1 queries for user profiles.
     */
    @EntityGraph(attributePaths = {"profile"})
    @Query("SELECT u FROM User u JOIN UserFollower uf ON u.id = uf.id.followedId WHERE uf.id.followerId = :followerId")
    Page<User> findFollowingByFollowerId(@Param("followerId") UUID followerId, Pageable pageable);
}