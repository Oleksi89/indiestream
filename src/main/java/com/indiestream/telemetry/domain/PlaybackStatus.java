package com.indiestream.telemetry.domain;

/**
 * Represents the evaluated quality of a playback event.
 */
public enum PlaybackStatus {
    SKIP,     // Less than 30 seconds
    PARTIAL,  // Between 30 seconds and 80% of track length
    FULL,     // >= 80% of track length
    UNKNOWN   // Fallback or un-evaluated
}