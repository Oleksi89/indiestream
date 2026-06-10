package com.indiestream.telemetry.dto.analytics;

public record RegionStatDto(
        String countryOrCity,
        long listeners,
        double percentageOfTotal
) {
}