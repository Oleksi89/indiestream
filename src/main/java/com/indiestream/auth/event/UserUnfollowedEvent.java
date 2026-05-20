package com.indiestream.auth.event;

import java.util.UUID;

public record UserUnfollowedEvent(UUID followerId, UUID followedId) {
}