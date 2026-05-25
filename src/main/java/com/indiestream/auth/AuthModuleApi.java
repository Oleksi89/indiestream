package com.indiestream.auth;

import java.util.Optional;
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

    boolean isProfileAccessible(UUID targetUserId, UUID currentUserId);

    /**
     * Legacy method for email resolution.
     * // TODO: [Auth] - Deprecate and replace with getUserPublicProfile in Media module metadata logic.
     */
    String getUserEmail(UUID userId);
}