package com.indiestream.media.api;

import com.indiestream.media.catalog.dto.TrackDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Explicit public interface for the Media module.
 * Exposes core metadata and flexible search capabilities to downstream consumers (BFF/Playlists).
 */
public interface MediaModuleApi {
    TrackMetadata getTrackMetadata(UUID trackId);

    /**
     * Batch resolves multiple track IDs into rich metadata objects.
     * Guarantees that the returned list strictly preserves the order of the input UUIDs.
     *
     * @param trackIds Ordered list of track UUIDs to resolve.
     * @return Ordered list of TrackMetadata.
     */
    List<TrackMetadata> getPublicTracksMetadata(List<UUID> trackIds);

    /**
     * Flexible search engine utilizing native GIN indexing.
     * Enforces strict TrackStatus.PUBLISHED visibility guard.
     */
    Page<TrackMetadata> searchPublicTracks(String query, String genre, String tagsCsv, Pageable pageable);


    Set<String> getAllowedGenres();

    TrackDto uploadTrackForSeeder(UUID artistId, String title, MultipartFile file, MultipartFile cover, String genre, boolean isExplicit, Set<String> customTags);
}