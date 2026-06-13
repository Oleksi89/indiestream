package com.indiestream.playlist.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.event.UserBannedEvent;
import com.indiestream.auth.event.UserRegisteredEvent;
import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.media.api.TrackArchivedEvent;
import com.indiestream.playlist.PlaylistLibraryProjection;
import com.indiestream.playlist.PlaylistModuleApi;
import com.indiestream.playlist.domain.*;
import com.indiestream.playlist.PlaylistDto;
import com.indiestream.playlist.dto.PlaylistTrackDetailsDto;
import com.indiestream.playlist.event.PlaylistCopiedEvent;
import com.indiestream.playlist.event.PlaylistFollowedEvent;
import com.indiestream.playlist.event.TrackAddedToPlaylistEvent;
import com.indiestream.playlist.event.TrackLikedEvent;
import com.indiestream.playlist.exception.PlaylistNotFoundException;
import com.indiestream.playlist.repository.PlaylistCollaboratorRepository;
import com.indiestream.playlist.repository.PlaylistFollowerRepository;
import com.indiestream.playlist.repository.PlaylistRepository;
import com.indiestream.playlist.repository.PlaylistTrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaylistService implements PlaylistModuleApi {

    private final PlaylistRepository playlistRepository;
    private final PlaylistTrackRepository playlistTrackRepository;
    private final PlaylistCollaboratorRepository collaboratorRepository;
    private final PlaylistFollowerRepository followerRepository;
    private final PlaylistStorageService storageService;

    // Cross-module strictly defined API calls
    private final MediaModuleApi mediaModuleApi;
    private final AuthModuleApi authModuleApi;
    private final ApplicationEventPublisher events;

    // --- CASCADING SECURITY LISTENERS ---

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserBannedEvent(UserBannedEvent event) {
        log.warn("Cascading privacy lockdown initiated for playlists owned by User ID: {}", event.userId());
        playlistRepository.enforceGlobalBanCascadingPrivacy(event.userId());
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTrackArchivedEvent(TrackArchivedEvent event) {
        log.info("Cascading data cleanup initiated for archived Track ID: {}", event.trackId());

        List<UUID> affectedPlaylistIds = playlistTrackRepository.findPlaylistIdsContainingTrack(event.trackId());

        for (UUID playlistId : affectedPlaylistIds) {
            playlistRepository.findByIdWithPessimisticWrite(playlistId).ifPresent(playlist -> {
                try {
                    TrackMetadata track = mediaModuleApi.getTrackMetadata(event.trackId());
                    playlist.setTrackCount(Math.max(0, playlist.getTrackCount() - 1));
                    playlist.setTotalDurationSeconds(Math.max(0, playlist.getTotalDurationSeconds() - track.durationSeconds()));
                    playlistRepository.save(playlist);
                } catch (Exception e) {
                    log.error("Failed to recalculate aggregates for playlist: {}", playlistId, e);
                }
            });
        }

        playlistTrackRepository.purgeArchivedTrackLinksBulk(event.trackId());
    }

    /**
     * Reacts to a successful user registration by asynchronously generating
     * the mandatory "Liked Tracks" system playlist.
     * Requires a new transaction to prevent blocking the auth process.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserRegistration(UserRegisteredEvent event) {
        log.info("Generating system playlist for newly registered user: {}", event.userId());

        Playlist likedTracks = Playlist.builder()
                .ownerId(event.userId())
                .name("Liked Tracks")
                .description("Your saved tracks.")
                .isPublic(false)
                .isSystem(true)
                .isCollaborative(false)
                .build();

        playlistRepository.save(likedTracks);
    }

    // --- CORE OPERATIONS ---

    @Transactional
    public PlaylistDto createCustomPlaylist(UUID ownerId, String name, String description, boolean isPublic, boolean isCollaborative) {
        Playlist playlist = Playlist.builder()
                .ownerId(ownerId)
                .name(name)
                .description(description)
                .isPublic(isPublic)
                .isSystem(false)
                .isCollaborative(isCollaborative)
                .build();

        return mapToDto(playlistRepository.save(playlist));
    }

    @Transactional(readOnly = true)
    public PlaylistDto getPlaylistById(UUID playlistId, UUID currentUserId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        if (!playlist.getIsPublic() && !playlist.getOwnerId().equals(currentUserId)) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlistId, currentUserId);
            if (!isCollaborator) {
                throw new AccessDeniedException("Access denied to private playlist.");
            }
        }
        return mapToDto(playlist);
    }

    /**
     * Fetches tracks within a playlist with full security checks and metadata resolution.
     */
    @Transactional(readOnly = true)
    public Page<PlaylistTrackDetailsDto> getPlaylistTracks(UUID playlistId, UUID userId, Pageable pageable) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        boolean isAuthorizedViewer = playlist.getOwnerId().equals(userId) ||
                collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlistId, userId);

        if (!playlist.getIsPublic() && !isAuthorizedViewer) {
            throw new AccessDeniedException("Access denied to this private playlist.");
        }

        Page<PlaylistTrack> trackPage = playlistTrackRepository.findAllByIdPlaylistIdOrderByPositionIndexAsc(playlistId, pageable);

        // TODO: [Auth/Performance] - Implement bulk profile resolution in AuthModuleApi to prevent N+1 queries.
        List<PlaylistTrackDetailsDto> filteredContent = trackPage.stream()
                .map(pt -> {
                    TrackMetadata metadata = mediaModuleApi.getTrackMetadata(pt.getId().getTrackId());

                    if (!"PUBLISHED".equals(metadata.statusCode())) {
                        if (!isAuthorizedViewer) {
                            return null;
                        }
                        return new PlaylistTrackDetailsDto(
                                pt.getId().getTrackId(),
                                "Content Unavailable",
                                metadata.artistId(),
                                "unavailable",
                                "Unavailable Artist",
                                0,
                                Collections.emptyMap(),
                                null,
                                pt.getAddedById(),
                                pt.getAddedAt(),
                                null,
                                false,
                                new PlaylistTrackDetailsDto.PlaylistTrackTagsDto(Collections.emptySet(), Collections.emptySet(), Collections.emptySet())
                        );
                    }

                    Optional<UserPublicProfile> profile = authModuleApi.getUserPublicProfile(metadata.artistId());

                    String artistAlias = profile.map(UserPublicProfile::alias).orElse("Unknown Artist");
                    String artistUsername = profile.map(UserPublicProfile::username).orElse("unknown");

                    PlaylistTrackDetailsDto.PlaylistTrackTagsDto tagsDto = new PlaylistTrackDetailsDto.PlaylistTrackTagsDto(
                            metadata.customTags() != null ? metadata.customTags() : Collections.emptySet(),
                            Collections.emptySet(),
                            metadata.aiGeneratedTags() != null ? metadata.aiGeneratedTags() : Collections.emptySet()
                    );

                    return new PlaylistTrackDetailsDto(
                            pt.getId().getTrackId(),
                            metadata.title(),
                            metadata.artistId(),
                            artistUsername,
                            artistAlias,
                            metadata.durationSeconds(),
                            metadata.stemsMetadata(),
                            metadata.coverMinioPath(),
                            pt.getAddedById(),
                            pt.getAddedAt(),
                            metadata.genre(),
                            metadata.isExplicit(),
                            tagsDto
                    );
                })
                .filter(Objects::nonNull)
                .toList();

        return new PageImpl<>(filteredContent, pageable, trackPage.getTotalElements());
    }

    /**
     * Retrieves the protected system playlist for a user.
     * Prevents UI components from needing to know the exact UUID of the "Liked Tracks" playlist.
     */
    @Transactional(readOnly = true)
    public PlaylistDto getUserLikedTracksPlaylist(UUID userId) {
        return playlistRepository.findByOwnerIdAndIsSystemTrue(userId)
                .map(this::mapToDto)
                .orElseThrow(() -> new IllegalStateException("System playlist missing for user " + userId));
    }

    @Transactional(readOnly = true)
    public Page<PlaylistDto> getUserLibrary(UUID userId, Pageable pageable) {
        return playlistRepository.findUserLibraryWithVisibilityGuards(userId, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<PlaylistDto> getUserPublicPlaylists(UUID targetUserId, UUID currentUserId, Pageable pageable) {
        if (!authModuleApi.isProfileAccessible(targetUserId, currentUserId)) {
            throw new AccessDeniedException("This profile is private.");
        }
        if (currentUserId != null && currentUserId.equals(targetUserId)) {
            return playlistRepository.findAllPlaylistsByOwnerId(targetUserId, pageable).map(this::mapToDto);
        }
        return playlistRepository.findPublicPlaylistsByOwnerId(targetUserId, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaylistLibraryProjection> getOwnedPlaylistsForLibrary(UUID userId) {
        return playlistRepository.findOwnedPlaylistsForLibrary(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaylistLibraryProjection> getFollowedPlaylistsForLibrary(UUID userId) {
        return followerRepository.findFollowedPlaylistsForLibrary(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaylistLibraryProjection> getCollaboratedPlaylistsForLibrary(UUID userId) {
        return collaboratorRepository.findCollaboratedPlaylistsForLibrary(userId);
    }

    /**
     * Cross-module robust search implementation.
     * Enforces visibility guarantees by exclusively querying public, non-system playlists.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<PlaylistDto> searchPublicPlaylists(String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return Page.empty(pageable);
        }

        Pageable effectivePageable = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "followersCount"))
                : pageable;

        List<Playlist> playlists = playlistRepository.searchPublicPlaylistsByName(query, effectivePageable);
        List<PlaylistDto> dtos = playlists.stream().map(this::mapToDto).toList();

        return new PageImpl<>(dtos, effectivePageable, dtos.size());
    }


    /**
     * Updates playlist metadata.
     * Guards prevent renaming or altering the core identity of system playlists.
     */
    @Transactional
    public PlaylistDto updatePlaylist(UUID playlistId, UUID userId, String name, String description, Boolean isPublic, Boolean isCollaborative) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceOwnerAccess(playlist, userId);

        // System playlists like "Liked Tracks" must remain immutable in name/descr/collaborative
        if (playlist.getIsSystem()) {
            if ((name != null && !name.equals(playlist.getName())) || (description != null && !description.equals(playlist.getDescription()))) {
                throw new IllegalArgumentException("System playlist identity and metadata text descriptions are immutable.");
            }
        }

        if (name != null && !name.isBlank() && !playlist.getIsSystem()) playlist.setName(name);
        if (description != null && !playlist.getIsSystem()) playlist.setDescription(description);
        if (isPublic != null) playlist.setIsPublic(isPublic);
        if (isCollaborative != null) playlist.setIsCollaborative(isCollaborative);

        return mapToDto(playlistRepository.save(playlist));
    }

    /**
     * Replaces the playlist cover image in MinIO, aggressively preventing orphan blobs.
     */
    @Transactional
    public PlaylistDto updatePlaylistCover(UUID playlistId, UUID userId, MultipartFile file) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceModificationAccess(playlist, userId);

        if (playlist.getIsSystem()) {
            throw new IllegalArgumentException("System playlists cannot have custom covers.");
        }

        if (playlist.getCoverMinioPath() != null) {
            storageService.deleteCover(playlist.getCoverMinioPath());
        }

        String newPath = storageService.uploadCover(file, playlistId);
        playlist.setCoverMinioPath(newPath);

        return mapToDto(playlistRepository.save(playlist));
    }

    @Transactional(readOnly = true)
    public InputStream getPlaylistCoverStream(UUID playlistId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        if (playlist.getCoverMinioPath() == null) {
            throw new IllegalStateException("Playlist has no cover configured.");
        }

        return storageService.getCoverStream(playlist.getCoverMinioPath());
    }

    /**
     * Deletes a custom playlist.
     * Cascading deletes on the DB level will automatically clear playlist_tracks.
     */
    @Transactional
    public void deletePlaylist(UUID playlistId, UUID userId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceOwnerAccess(playlist, userId);

        if (playlist.getIsSystem()) {
            throw new IllegalArgumentException("System playlists cannot be deleted.");
        }

        if (playlist.getCoverMinioPath() != null) {
            storageService.deleteCover(playlist.getCoverMinioPath());
        }

        playlistRepository.delete(playlist);
    }

    /**
     * Adds a track to a playlist with concurrency protection.
     * Uses PESSIMISTIC_WRITE to prevent aggregate count corruption.
     */
    @Transactional
    public void addTrackToPlaylist(UUID playlistId, UUID trackId, UUID userId) {
        Playlist playlist = playlistRepository.findByIdWithPessimisticWrite(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceModificationAccess(playlist, userId);

        PlaylistTrackId linkId = new PlaylistTrackId(playlistId, trackId);

        if (playlistTrackRepository.existsById(linkId)) return;

        // Fetch duration from Media module API
        TrackMetadata metadata = mediaModuleApi.getTrackMetadata(trackId);

        if (!"PUBLISHED".equals(metadata.statusCode()) && !"APPROVED".equals(metadata.statusCode())) {
            throw new IllegalArgumentException("Cannot add non-approved or restricted tracks to playlists.");
        }

        Integer maxPosition = playlistTrackRepository.findMaxPositionIndexByPlaylistId(playlistId);
        int nextPosition = (maxPosition == null || maxPosition == -1) ? 0 : maxPosition + 1;

        PlaylistTrack link = PlaylistTrack.builder()
                .id(new PlaylistTrackId(playlistId, trackId))
                .addedById(userId)
                .positionIndex(nextPosition)
                .build();

        playlistTrackRepository.save(link);

        // Update cached aggregates
        playlist.setTrackCount(playlist.getTrackCount() + 1);
        playlist.setTotalDurationSeconds(playlist.getTotalDurationSeconds() + metadata.durationSeconds());
        playlistRepository.save(playlist);

        if (playlist.getIsSystem()) {
            events.publishEvent(new TrackLikedEvent(userId, trackId, Instant.now()));
        } else {
            events.publishEvent(new TrackAddedToPlaylistEvent(userId, playlistId, trackId, Instant.now()));
        }
    }

    /**
     * Removes a track and recalculates aggregates safely using PESSIMISTIC_WRITE.
     */
    @Transactional
    public void removeTrackFromPlaylist(UUID playlistId, UUID trackId, UUID userId) {
        Playlist playlist = playlistRepository.findByIdWithPessimisticWrite(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceModificationAccess(playlist, userId);

        PlaylistTrack link = playlistTrackRepository.findById(new PlaylistTrackId(playlistId, trackId))
                .orElseThrow(() -> new IllegalArgumentException("Track is not in this playlist."));

        TrackMetadata track = mediaModuleApi.getTrackMetadata(trackId);
        playlistTrackRepository.delete(link);

        playlist.setTrackCount(Math.max(0, playlist.getTrackCount() - 1));
        playlist.setTotalDurationSeconds(Math.max(0, playlist.getTotalDurationSeconds() - track.durationSeconds()));
        playlistRepository.save(playlist);
    }

    /**
     * Executes a high-performance deep copy of a public or collaborated playlist.
     * Replaces standard JPA iteration with a direct native SQL bulk insert
     * to prevent memory exhaustion and connection pool timeouts on large datasets.
     */
    @Transactional
    public PlaylistDto duplicatePlaylist(UUID sourcePlaylistId, UUID newOwnerId) {
        Playlist source = playlistRepository.findById(sourcePlaylistId)
                .orElseThrow(() -> new PlaylistNotFoundException(sourcePlaylistId));

        // Visibility & Access Guard
        if (!source.getIsPublic() && !source.getOwnerId().equals(newOwnerId)) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(sourcePlaylistId, newOwnerId);
            if (!isCollaborator) {
                throw new AccessDeniedException("Cannot duplicate a private playlist without collaborator access.");
            }
        }

        // 1. Create the new root Playlist entity
        Playlist cloned = Playlist.builder()
                .ownerId(newOwnerId)
                .name(source.getName() + " (Copy)")
                .description(source.getDescription())
                .coverMinioPath(source.getCoverMinioPath())
                .isPublic(false)
                .isSystem(false)
                .isCollaborative(false)
                .trackCount(source.getTrackCount())
                .totalDurationSeconds(source.getTotalDurationSeconds())
                .build();

        Playlist savedClone = playlistRepository.save(cloned);

        // 2. Execute O(1) Native SQL Bulk Insert
        playlistTrackRepository.cloneTracksBulk(sourcePlaylistId, savedClone.getId(), newOwnerId);

        // 3. Publish Telemetry
        events.publishEvent(new PlaylistCopiedEvent(
                newOwnerId,
                sourcePlaylistId,
                savedClone.getId(),
                Instant.now()
        ));

        return mapToDto(savedClone);
    }

    // --- Social Collaboration Features ---

    @Transactional
    public void addCollaboratorByUsername(UUID playlistId, UUID ownerId, String targetUsername) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceOwnerAccess(playlist, ownerId);

        if (!playlist.getIsCollaborative()) {
            throw new IllegalArgumentException("Playlist is not marked as collaborative.");
        }

        UserPublicProfile targetProfile = authModuleApi.getUserPublicProfileByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found: " + targetUsername));

        PlaylistCollaboratorId collabId = new PlaylistCollaboratorId(playlistId, targetProfile.id());

        if (collaboratorRepository.existsById(collabId)) {
            return;
        }

        PlaylistCollaborator collaborator = PlaylistCollaborator.builder()
                .id(collabId)
                .build();

        collaboratorRepository.save(collaborator);
    }

    @Transactional
    public void removeCollaborator(UUID playlistId, UUID requesterId, UUID collaboratorId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        // Strict RBAC: Owner can remove anyone. Collaborator can only remove themselves (leave).
        if (!playlist.getOwnerId().equals(requesterId)) {
            if (!requesterId.equals(collaboratorId)) {
                throw new AccessDeniedException("Only the owner can remove other collaborators.");
            }
        }

        collaboratorRepository.deleteById(new PlaylistCollaboratorId(playlistId, collaboratorId));
    }

    @Transactional
    public void followPlaylist(UUID playlistId, UUID userId) {
        Playlist playlist = playlistRepository.findByIdWithPessimisticWrite(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        if (!playlist.getIsPublic()) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlistId, userId);
            if (!isCollaborator && !playlist.getOwnerId().equals(userId)) {
                throw new AccessDeniedException("Cannot follow a private playlist.");
            }
        }

        PlaylistFollowerId followerId = new PlaylistFollowerId(userId, playlistId);
        if (followerRepository.existsById(followerId)) {
            return;
        }

        PlaylistFollower follower = PlaylistFollower.builder()
                .id(followerId)
                .build();

        followerRepository.save(follower);

        playlist.setFollowersCount(playlist.getFollowersCount() + 1);
        playlistRepository.save(playlist);

        events.publishEvent(new PlaylistFollowedEvent(userId, playlistId, Instant.now()));
    }

    /**
     * Unbinds a user and decrements the aggregate safely.
     */
    @Transactional
    public void unfollowPlaylist(UUID playlistId, UUID userId) {
        Playlist playlist = playlistRepository.findByIdWithPessimisticWrite(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        PlaylistFollowerId followerId = new PlaylistFollowerId(userId, playlistId);
        if (!followerRepository.existsById(followerId)) {
            return;
        }

        followerRepository.deleteById(followerId);

        playlist.setFollowersCount(Math.max(0, playlist.getFollowersCount() - 1));
        playlistRepository.save(playlist);
    }

    // --- Private Guards & Aggregation ---

    private void enforceOwnerAccess(Playlist playlist, UUID userId) {
        if (!playlist.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("Operation restricted to playlist owner.");
        }
    }

    private void enforceModificationAccess(Playlist playlist, UUID userId) {
        if (playlist.getOwnerId().equals(userId)) return;

        if (playlist.getIsCollaborative()) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlist.getId(), userId);
            if (isCollaborator) return;
        }
        throw new AccessDeniedException("Modification access denied. Must be owner or collaborator.");
    }

    private PlaylistDto mapToDto(Playlist playlist) {
        Optional<UserPublicProfile> profile = authModuleApi.getUserPublicProfile(playlist.getOwnerId());
        String ownerAlias = profile.map(UserPublicProfile::alias).orElse("Unknown User");
        String ownerUsername = profile.map(UserPublicProfile::username).orElse("unknown");
        String ownerAvatarPath = profile.map(UserPublicProfile::avatarPath).orElse(null);

        // Dynamically bind collaborator graph profiles
        List<PlaylistCollaborator> collaboratorEntities = collaboratorRepository.findAllByIdPlaylistId(playlist.getId());
        Set<UUID> collaboratorIds = collaboratorEntities.stream()
                .map(c -> c.getId().getUserId())
                .collect(Collectors.toSet());
        List<UserPublicProfile> collaborators = authModuleApi.getPublicProfiles(collaboratorIds);

        return new PlaylistDto(
                playlist.getId(),
                playlist.getOwnerId(),
                ownerUsername,
                ownerAlias,
                ownerAvatarPath,
                playlist.getName(),
                playlist.getDescription(),
                playlist.getCoverMinioPath(),
                playlist.getIsPublic(),
                playlist.getIsSystem(),
                playlist.getIsCollaborative(),
                playlist.getTrackCount(),
                playlist.getTotalDurationSeconds(),
                playlist.getFollowersCount(),
                collaborators,
                playlist.getCreatedAt(),
                playlist.getUpdatedAt()
        );
    }
}