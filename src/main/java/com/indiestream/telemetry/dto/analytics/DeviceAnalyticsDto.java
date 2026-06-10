package com.indiestream.telemetry.dto.analytics;

import java.util.List;

public record DeviceAnalyticsDto(
        double mobilePercentage,
        double desktopPercentage,
        double otherPercentage,
        List<String> topBrowsers
) {
}