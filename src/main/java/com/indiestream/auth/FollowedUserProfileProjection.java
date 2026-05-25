package com.indiestream.auth;

import java.time.Instant;
import java.util.UUID;

public record FollowedUserProfileProjection(
        UUID id,
        String alias,
        String username,
        String avatarPath,
        Instant followedAt
) {
}