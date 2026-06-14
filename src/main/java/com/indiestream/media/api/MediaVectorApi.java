package com.indiestream.media.api;

import java.util.Optional;
import java.util.UUID;

/**
 * Public facade exclusively for cross-module AI vector lookups.
 * Prevents external modules from tightly coupling to the internal TrackRepository.
 */
public interface MediaVectorApi {
    Optional<float[]> getTrackVector(UUID trackId);
}