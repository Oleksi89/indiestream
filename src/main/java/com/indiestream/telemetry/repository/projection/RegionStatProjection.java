package com.indiestream.telemetry.repository.projection;

public record RegionStatProjection(
        String countryOrCity,
        long listeners
) {
}