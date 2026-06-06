package com.indiestream.library.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.library.dto.GlobalSearchResponseDto;
import com.indiestream.library.dto.SearchTrackDto;
import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.playlist.PlaylistModuleApi;
import com.indiestream.playlist.PlaylistDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SearchAggregationService {

    private final AuthModuleApi authModuleApi;
    private final MediaModuleApi mediaModuleApi;
    private final PlaylistModuleApi playlistModuleApi;
    private final Executor taskExecutor;

    // Hard timeout for cross-module internal calls to guarantee fast API response times
    private static final int TIMEOUT_SECONDS = 2;

    public SearchAggregationService(
            AuthModuleApi authModuleApi,
            MediaModuleApi mediaModuleApi,
            PlaylistModuleApi playlistModuleApi,
            @Qualifier("applicationTaskExecutor") Executor taskExecutor) {
        this.authModuleApi = authModuleApi;
        this.mediaModuleApi = mediaModuleApi;
        this.playlistModuleApi = playlistModuleApi;
        this.taskExecutor = taskExecutor;
    }

    /**
     * Executes parallel, cross-module queries.
     * Implements Fail-Safe pattern: module failures or timeouts return empty lists
     * rather than crashing the entire global search operation.
     */
    public GlobalSearchResponseDto globalSearch(String query, String genre, String tagsCsv, int limit) {
        boolean hasQuery = query != null && !query.isBlank();
        boolean hasTags = tagsCsv != null && !tagsCsv.isBlank();
        boolean hasGenre = genre != null && !genre.isBlank();

        if (!hasQuery && !hasTags && !hasGenre) {
            return new GlobalSearchResponseDto(Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
        }

        Pageable pageable = PageRequest.of(0, limit);

        CompletableFuture<List<UserPublicProfile>> profilesFuture = CompletableFuture.supplyAsync(() ->
                        hasQuery ? authModuleApi.searchPublicProfiles(query, pageable).getContent() : Collections.<UserPublicProfile>emptyList(),
                taskExecutor
        ).exceptionally(ex -> {
            log.error("Auth module search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }).completeOnTimeout(Collections.emptyList(), TIMEOUT_SECONDS, TimeUnit.SECONDS);

        CompletableFuture<List<PlaylistDto>> playlistsFuture = CompletableFuture.supplyAsync(() ->
                        hasQuery ? playlistModuleApi.searchPublicPlaylists(query, pageable).getContent() : Collections.<PlaylistDto>emptyList(),
                taskExecutor
        ).exceptionally(ex -> {
            log.error("Playlist module search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }).completeOnTimeout(Collections.emptyList(), TIMEOUT_SECONDS, TimeUnit.SECONDS);

        CompletableFuture<List<TrackMetadata>> tracksFuture = CompletableFuture.supplyAsync(() ->
                mediaModuleApi.searchPublicTracks(query, genre, tagsCsv, pageable).getContent(), taskExecutor
        ).exceptionally(ex -> {
            log.error("Media module search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }).completeOnTimeout(Collections.emptyList(), TIMEOUT_SECONDS, TimeUnit.SECONDS);

        // Synchronization barrier: wait for all to complete or timeout
        CompletableFuture.allOf(profilesFuture, tracksFuture, playlistsFuture).join();

        return new GlobalSearchResponseDto(
                enrichTracksWithArtistProfiles(tracksFuture.join()),
                playlistsFuture.join(),
                profilesFuture.join()
        );
    }

    /**
     * Executes a semantic native GIN search primarily targeting media entities.
     * Designed to interface with the upcoming AI auto-tagging pipeline.
     */
    public GlobalSearchResponseDto searchByTags(String tagsCsv, int limit) {
        if (tagsCsv == null || tagsCsv.isBlank()) {
            return new GlobalSearchResponseDto(Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
        }

        Pageable pageable = PageRequest.of(0, limit);

        CompletableFuture<List<TrackMetadata>> tracksFuture = CompletableFuture.supplyAsync(() ->
                mediaModuleApi.searchPublicTracks(null, null, tagsCsv, pageable).getContent(), taskExecutor
        ).exceptionally(ex -> {
            log.error("Media module tag search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }).completeOnTimeout(Collections.emptyList(), TIMEOUT_SECONDS, TimeUnit.SECONDS);

        // Playlists and Profiles do not currently support GIN tag semantics.
        // Returning empty lists for them instantly.
        return new GlobalSearchResponseDto(
                enrichTracksWithArtistProfiles(tracksFuture.join()),
                Collections.emptyList(),
                Collections.emptyList()
        );
    }

    /**
     * Bulk resolves artist profiles.
     */
    private List<SearchTrackDto> enrichTracksWithArtistProfiles(List<TrackMetadata> rawTracks) {
        if (rawTracks.isEmpty()) return Collections.emptyList();

        Set<UUID> artistIds = rawTracks.stream()
                .map(TrackMetadata::artistId)
                .collect(Collectors.toSet());

        Map<UUID, UserPublicProfile> profilesMap = authModuleApi.getPublicProfiles(artistIds)
                .stream()
                .collect(Collectors.toMap(UserPublicProfile::id, p -> p));

        return rawTracks.stream().map(t -> {
            UserPublicProfile profile = profilesMap.get(t.artistId());
            String alias = profile != null ? profile.alias() : "Unknown Artist";
            String username = profile != null ? profile.username() : "unknown";

            return new SearchTrackDto(
                    t.id(), t.title(), t.artistId(), username, alias,
                    t.durationSeconds(), t.stemsMetadata(), t.coverMinioPath(),
                    t.genre(), t.isExplicit(),
                    new SearchTrackDto.SearchTrackTagsDto(t.customTags(), Collections.emptySet(), t.aiGeneratedTags())
            );
        }).toList();
    }
}