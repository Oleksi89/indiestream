package com.indiestream.recommendation.dto;

/**
 * Dictates the contextual algorithm used for generating the continuous playback queue.
 */
public enum AutoplayMode {
    PLAYLIST, // Driven by the playlist Centroid Vector
    TASTE     // Driven by the user Taste Vector
}