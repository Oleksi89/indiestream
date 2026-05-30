package com.indiestream.auth;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Public interface for the Auth module.
 * Exposes safe, read-only operations to other modules.
 */
public interface AuthModuleApi {
    /**
     * Resolves a user's public identity for UI display and social features.
     *
     * @param userId The unique identifier of the user.
     * @return Optional containing the profile, or empty if not found.
     */
    Optional<UserPublicProfile> getUserPublicProfile(UUID userId);

    /**
     * Resolves a user's public identity directly by their unique username.
     */
    Optional<UserPublicProfile> getUserPublicProfileByUsername(String username);

    /**
     * Bulk resolves multiple user profiles simultaneously to prevent N+1 queries during aggregation.
     */
    List<UserPublicProfile> getPublicProfiles(Set<UUID> userIds);

    boolean isProfileAccessible(UUID targetUserId, UUID currentUserId);

    List<FollowedUserProfileProjection> getFollowedProfilesForLibrary(UUID followerId);

    java.util.Map<UUID, String> getUserAliases(Set<UUID> userIds);

    /**
     * Legacy method for email resolution.
     * // TODO: [Auth] - Deprecate and replace with getUserPublicProfile in Media module metadata logic.
     */
    String getUserEmail(UUID userId);
}