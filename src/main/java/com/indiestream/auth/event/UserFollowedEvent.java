package com.indiestream.auth.event;

import java.util.UUID;

public record UserFollowedEvent(UUID followerId, UUID followedId) {
}