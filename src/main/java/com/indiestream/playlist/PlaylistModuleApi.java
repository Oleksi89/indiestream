package com.indiestream.playlist;

import java.util.List;
import java.util.UUID;

public interface PlaylistModuleApi {
    List<PlaylistLibraryProjection> getOwnedPlaylistsForLibrary(UUID userId);

    List<PlaylistLibraryProjection> getFollowedPlaylistsForLibrary(UUID userId);

    List<PlaylistLibraryProjection> getCollaboratedPlaylistsForLibrary(UUID userId);
}