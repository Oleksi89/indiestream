package com.indiestream.telemetry.repository.projection;

public record AttributionProjection(
        String sourceType,
        long count
) {
}