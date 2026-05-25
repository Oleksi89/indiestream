package com.indiestream.library.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.FollowedUserProfileProjection;
import com.indiestream.library.domain.LibraryItemType;
import com.indiestream.library.dto.LibraryItemDto;
import com.indiestream.playlist.PlaylistModuleApi;
import com.indiestream.playlist.PlaylistLibraryProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class LibraryAggregationService {

    private final PlaylistModuleApi playlistModuleApi;
    private final AuthModuleApi authModuleApi;

    /**
     * Orchestrates the fetching of lightweight projections across bounded contexts.
     * Executes internal read-only API calls in parallel using CompletableFuture.
     */
    public List<LibraryItemDto> getUserLibrary(UUID userId) {
        // 1. Fire queries in parallel to internal APIs (Strict Modulith boundaries respected)
        CompletableFuture<List<PlaylistLibraryProjection>> ownedFuture =
                CompletableFuture.supplyAsync(() -> playlistModuleApi.getOwnedPlaylistsForLibrary(userId));

        CompletableFuture<List<PlaylistLibraryProjection>> followedPlaylistsFuture =
                CompletableFuture.supplyAsync(() -> playlistModuleApi.getFollowedPlaylistsForLibrary(userId));

        CompletableFuture<List<FollowedUserProfileProjection>> followedProfilesFuture =
                CompletableFuture.supplyAsync(() -> authModuleApi.getFollowedProfilesForLibrary(userId));

        // Wait for all IO operations to complete
        CompletableFuture.allOf(ownedFuture, followedPlaylistsFuture, followedProfilesFuture).join();

        List<PlaylistLibraryProjection> ownedPlaylists = ownedFuture.join();
        List<PlaylistLibraryProjection> followedPlaylists = followedPlaylistsFuture.join();
        List<FollowedUserProfileProjection> followedProfiles = followedProfilesFuture.join();

        // 2. Resolve missing aggregate data (Owner Aliases for playlists) safely via Auth API
        Set<UUID> ownerIdsToResolve = Stream.concat(ownedPlaylists.stream(), followedPlaylists.stream())
                .map(PlaylistLibraryProjection::ownerId)
                .collect(Collectors.toSet());

        Map<UUID, String> ownerAliases = authModuleApi.getUserAliases(ownerIdsToResolve);

        // 3. Map projections to the unified polymorphic DTO
        List<LibraryItemDto> library = new ArrayList<>();

        ownedPlaylists.forEach(p -> library.add(new LibraryItemDto(
                p.id(),
                LibraryItemType.OWNED_PLAYLIST,
                p.name(),
                p.coverMinioPath(),
                "Playlist • " + ownerAliases.getOrDefault(p.ownerId(), "Unknown"),
                p.addedAt()
        )));

        followedPlaylists.forEach(p -> library.add(new LibraryItemDto(
                p.id(),
                LibraryItemType.FOLLOWED_PLAYLIST,
                p.name(),
                p.coverMinioPath(),
                "Playlist • " + ownerAliases.getOrDefault(p.ownerId(), "Unknown"),
                p.addedAt()
        )));

        followedProfiles.forEach(p -> library.add(new LibraryItemDto(
                p.id(),
                LibraryItemType.FOLLOWED_PROFILE,
                p.alias(),
                p.avatarPath(),
                "Profile • @" + p.username(),
                p.followedAt()
        )));

        // 4. Sort aggregated timeline descending by action timestamp
        library.sort(Comparator.comparing(LibraryItemDto::addedAt).reversed());

        return library;
    }
}