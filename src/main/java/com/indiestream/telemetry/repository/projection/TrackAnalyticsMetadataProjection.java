package com.indiestream.telemetry.repository.projection;

import java.util.UUID;

/**
 * Isolated Read-Model projection for enriching artist and admin analytics dashboards.
 * Bypasses the core domain entities to prevent internal metric leakage to public APIs.
 */
public record TrackAnalyticsMetadataProjection(
        UUID trackId,
        String title,
        String coverMinioPath,
        Double popularityScore
) {
}