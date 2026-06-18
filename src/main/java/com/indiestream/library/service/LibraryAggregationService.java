package com.indiestream.library.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.FollowedUserProfileProjection;
import com.indiestream.library.domain.LibraryItemType;
import com.indiestream.library.dto.LibraryItemDto;
import com.indiestream.playlist.api.PlaylistModuleApi;
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
        // 1. Fire queries in parallel to internal APIs
        CompletableFuture<List<PlaylistLibraryProjection>> ownedFuture =
                CompletableFuture.supplyAsync(() -> playlistModuleApi.getOwnedPlaylistsForLibrary(userId));

        CompletableFuture<List<PlaylistLibraryProjection>> followedPlaylistsFuture =
                CompletableFuture.supplyAsync(() -> playlistModuleApi.getFollowedPlaylistsForLibrary(userId));

        CompletableFuture<List<PlaylistLibraryProjection>> collaboratedPlaylistsFuture =
                CompletableFuture.supplyAsync(() -> playlistModuleApi.getCollaboratedPlaylistsForLibrary(userId));

        CompletableFuture<List<FollowedUserProfileProjection>> followedProfilesFuture =
                CompletableFuture.supplyAsync(() -> authModuleApi.getFollowedProfilesForLibrary(userId));

        CompletableFuture.allOf(ownedFuture, followedPlaylistsFuture, collaboratedPlaylistsFuture, followedProfilesFuture).join();

        List<PlaylistLibraryProjection> ownedPlaylists = ownedFuture.join();
        List<PlaylistLibraryProjection> followedPlaylists = followedPlaylistsFuture.join();
        List<PlaylistLibraryProjection> collaboratedPlaylists = collaboratedPlaylistsFuture.join();
        List<FollowedUserProfileProjection> followedProfiles = followedProfilesFuture.join();

        // 2. Resolve missing aggregate data (Owner Aliases)
        Set<UUID> ownerIdsToResolve = Stream.of(ownedPlaylists, followedPlaylists, collaboratedPlaylists)
                .flatMap(List::stream)
                .map(PlaylistLibraryProjection::ownerId)
                .collect(Collectors.toSet());

        Map<UUID, String> ownerAliases = authModuleApi.getUserAliases(ownerIdsToResolve);

        // 3. Deduplication and Flagging Engine
        Map<UUID, LibraryItemDto> libraryMap = new HashMap<>();

        // A. Owned
        ownedPlaylists.forEach(p -> libraryMap.put(p.id(), new LibraryItemDto(
                p.id(), LibraryItemType.OWNED_PLAYLIST, p.name(), p.coverMinioPath(),
                ownerAliases.getOrDefault(p.ownerId(), "Unknown"),
                p.addedAt(), p.ownerId().toString(), p.isCollaborative(), false
        )));

        // B. Followed (Will not overwrite if owned, though logically impossible in DB)
        followedPlaylists.forEach(p -> libraryMap.putIfAbsent(p.id(), new LibraryItemDto(
                p.id(),
                LibraryItemType.FOLLOWED_PLAYLIST,
                p.name(),
                p.coverMinioPath(),
                ownerAliases.getOrDefault(p.ownerId(), "Unknown"),
                p.addedAt(), p.ownerId().toString(), p.isCollaborative(), false
        )));

        // C. Collaborated (Highest priority for Followed overrides. Promotes to 'isCollaborator = true')
        collaboratedPlaylists.forEach(p -> {
            LibraryItemDto existing = libraryMap.get(p.id());
            String subtitle = ownerAliases.getOrDefault(p.ownerId(), "Unknown");
            if (existing != null) {
                // Elevate existing record with collaborator privileges
                libraryMap.put(p.id(), new LibraryItemDto(
                        existing.id(), existing.type(), existing.title(), existing.imageUrl(), existing.subtitle(),
                        existing.addedAt(), existing.ownerId(), existing.isCollaborative(), true
                ));
            } else {
                libraryMap.put(p.id(), new LibraryItemDto(
                        p.id(),
                        LibraryItemType.COLLABORATED_PLAYLIST,
                        p.name(),
                        p.coverMinioPath(),
                        subtitle, p.addedAt(), p.ownerId().toString(), p.isCollaborative(), true
                ));
            }
        });

        // D. Profiles
        followedProfiles.forEach(p -> libraryMap.put(p.id(), new LibraryItemDto(
                p.id(), LibraryItemType.FOLLOWED_PROFILE, p.alias(), p.avatarPath(),
                "@" + p.username(), p.followedAt(), null, false, false
        )));

        // 4. Sort and return
        List<LibraryItemDto> libraryList = new ArrayList<>(libraryMap.values());
        libraryList.sort(Comparator.comparing(LibraryItemDto::addedAt).reversed());

        return libraryList;
    }
}