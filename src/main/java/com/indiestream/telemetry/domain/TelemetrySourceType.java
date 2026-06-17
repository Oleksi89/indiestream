package com.indiestream.telemetry.domain;

/**
 * Defines the macro-context of where the interaction originated.
 * Used for Attribution Funnel analytics.
 */
public enum TelemetrySourceType {
    SEARCH,
    PLAYLIST,
    ALBUM,
    PROFILE,
    PUBLIC_FEED,
    EXTERNAL_SHARE,
    SYSTEM_RECOMMENDATION,
    SYSTEM_INTERNAL
}