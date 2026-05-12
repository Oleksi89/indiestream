package com.indiestream.auth;

import java.util.UUID;

/**
 * Public interface for the Auth module.
 * Exposes safe, read-only operations to other modules.
 */
public interface AuthModuleApi {
    String getUserEmail(UUID userId);
}