package com.indiestream.telemetry.api;

import java.util.List;
import java.util.UUID;

/**
 * Public facade for the Telemetry module.
 * Enforces Modulith boundaries by exposing analytical read-models safely.
 */
public interface TelemetryModuleApi {

    /**
     * Fetches tracks a user has interacted with recently to serve as an anti-fatigue filter.
     * * @param userId The UUID of the listener.
     *
     * @param days The look-back window in days.
     * @return A distinct list of recently played track UUIDs.
     */
    List<UUID> getRecentTrackIds(UUID userId, int days);
}