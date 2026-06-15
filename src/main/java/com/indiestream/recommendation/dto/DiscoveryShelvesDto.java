package com.indiestream.recommendation.dto;

import com.indiestream.media.api.TrackMetadata;
import com.indiestream.playlist.PlaylistDto;

import java.util.List;

/**
 * Composite DTO representing the multi-lane discovery interface.
 * Transports hydrated public contracts from adjacent modules.
 */
public record DiscoveryShelvesDto(
        List<TrackMetadata> madeForYou,
        List<PlaylistDto> discoverPlaylists,
        List<TrackMetadata> listenersLikeYou
) {
}