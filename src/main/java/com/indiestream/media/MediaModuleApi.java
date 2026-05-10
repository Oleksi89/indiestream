package com.indiestream.media;

import java.util.UUID;

/**
 * Explicit public interface for the Media module.
 * Only classes in this root package are accessible to the 'Playlist' module.
 */
public interface MediaModuleApi {
    TrackMetadata getTrackMetadata(UUID trackId);
}