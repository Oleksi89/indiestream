package com.indiestream.telemetry.dto.analytics;

import java.util.List;

public record AudienceDemographicsDto(
        List<RegionStatDto> topCountries,
        List<RegionStatDto> topCities
) {
}