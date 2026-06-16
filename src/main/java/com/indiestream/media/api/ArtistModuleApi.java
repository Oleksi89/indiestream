package com.indiestream.media.api;

import java.util.UUID;

/**
 * Public API for external modules to interact with Artist-specific workflows.
 */
public interface ArtistModuleApi {

    /**
     * Publishes a track to the global public feed.
     *
     * @param trackId  The ID of the track.
     * @param artistId The ID of the artist who owns the track.
     */
    void publishTrack(UUID trackId, UUID artistId);
}