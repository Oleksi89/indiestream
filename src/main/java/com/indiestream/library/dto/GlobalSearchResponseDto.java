package com.indiestream.library.dto;

import com.indiestream.auth.UserPublicProfile;
import com.indiestream.playlist.PlaylistDto;

import java.util.List;

/**
 * Unified Backend-For-Frontend (BFF) response object for global searches.
 * Aggregates cross-module DTOs into a single, strongly-typed JSON structure.
 */
public record GlobalSearchResponseDto(
        List<SearchTrackDto> tracks,
        List<PlaylistDto> playlists,
        List<UserPublicProfile> profiles
) {
}