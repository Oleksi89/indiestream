package com.indiestream.playlist.api;

import java.util.Optional;
import java.util.UUID;

/**
 * Explicit public gateway for the Recommendation module to access
 * mathematical representations of playlists without coupling to the domain entity.
 */
public interface PlaylistRecommendationFacade {
    /**
     * Retrieves the mathematically calculated centroid vector for a given playlist.
     *
     * @param playlistId The UUID of the playlist.
     * @return 768D float array if the playlist exists and has a calculated centroid.
     */
    Optional<float[]> getPlaylistCentroidVector(UUID playlistId);
}