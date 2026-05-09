package com.indiestream.auth;

import java.util.UUID;

/**
 * Domain event published when a new user is successfully registered.
 * Used to trigger cross-module asynchronous workflows (e.g., creating system playlists).
 */
public record UserRegisteredEvent(UUID userId) {
}