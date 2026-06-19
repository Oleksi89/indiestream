package com.indiestream.playlist.api;

import com.indiestream.playlist.PlaylistDto;
import com.indiestream.playlist.PlaylistLibraryProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Public facade for the Playlist domain.
 * Exposes safe, read-only aggregations and metadata resolutions.
 */
public interface PlaylistModuleApi {
    List<PlaylistLibraryProjection> getOwnedPlaylistsForLibrary(UUID userId);

    List<PlaylistLibraryProjection> getFollowedPlaylistsForLibrary(UUID userId);

    List<PlaylistLibraryProjection> getCollaboratedPlaylistsForLibrary(UUID userId);

    /**
     * Batch resolves multiple playlist IDs into rich DTO objects.
     * Guarantees that the returned list strictly preserves the order of the input UUIDs.
     *
     * @param playlistIds Ordered list of playlist UUIDs.
     * @return Ordered list of hydrated PlaylistDto records.
     */
    List<PlaylistDto> getPlaylistsByIds(List<UUID> playlistIds);

    /**
     * Cross-module search API enforcing visibility (isPublic = true AND isSystem = false).
     */
    Page<PlaylistDto> searchPublicPlaylists(String query, Pageable pageable);

    PlaylistDto createCustomPlaylist(UUID ownerId, String name, String description, boolean isPublic, boolean isCollaborative);

    void addTrackToPlaylist(UUID playlistId, UUID trackId, UUID userId);

    PlaylistDto updatePlaylistCover(UUID playlistId, UUID userId, MultipartFile file);
}