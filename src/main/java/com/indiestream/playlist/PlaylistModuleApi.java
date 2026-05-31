package com.indiestream.playlist;

import com.indiestream.playlist.dto.PlaylistDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PlaylistModuleApi {
    List<PlaylistLibraryProjection> getOwnedPlaylistsForLibrary(UUID userId);

    List<PlaylistLibraryProjection> getFollowedPlaylistsForLibrary(UUID userId);

    List<PlaylistLibraryProjection> getCollaboratedPlaylistsForLibrary(UUID userId);

    /**
     * Cross-module search API enforcing visibility (isPublic = true AND isSystem = false).
     */
    Page<PlaylistDto> searchPublicPlaylists(String query, Pageable pageable);
}