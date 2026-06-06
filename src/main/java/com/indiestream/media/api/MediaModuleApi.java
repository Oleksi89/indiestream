package com.indiestream.media.api;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Explicit public interface for the Media module.
 * Exposes core metadata and flexible search capabilities to downstream consumers (BFF/Playlists).
 */
public interface MediaModuleApi {
    TrackMetadata getTrackMetadata(UUID trackId);

    /**
     * Flexible search engine utilizing native GIN indexing.
     * Enforces strict TrackStatus.READY visibility guard.
     */
    Page<TrackMetadata> searchPublicTracks(String query, String genre, String tagsCsv, Pageable pageable);
}