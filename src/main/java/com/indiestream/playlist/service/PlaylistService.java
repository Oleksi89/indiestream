package com.indiestream.playlist.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.event.UserRegisteredEvent;
import com.indiestream.media.MediaModuleApi;
import com.indiestream.media.TrackMetadata;
import com.indiestream.playlist.PlaylistLibraryProjection;
import com.indiestream.playlist.PlaylistModuleApi;
import com.indiestream.playlist.domain.*;
import com.indiestream.playlist.dto.PlaylistDto;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaylistService implements PlaylistModuleApi {

    private final PlaylistRepository playlistRepository;
    private final PlaylistTrackRepository playlistTrackRepository;
    private final PlaylistCollaboratorRepository collaboratorRepository;
    private final PlaylistFollowerRepository followerRepository;

    // Cross-module strictly defined API call
    private final MediaModuleApi mediaModuleApi;
    private final AuthModuleApi authModuleApi;
    private final ApplicationEventPublisher events;

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

        // Visibility guard
        if (!playlist.getIsPublic() && !playlist.getOwnerId().equals(userId)) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlistId, userId);
            if (!isCollaborator) {
                throw new AccessDeniedException("Access denied to this private playlist.");
            }
        }

        // TODO: [Auth/Performance] - Implement bulk profile resolution in AuthModuleApi to prevent N+1 queries.
        return playlistTrackRepository.findAllByIdPlaylistIdOrderByPositionIndexAsc(playlistId, pageable)
                .map(pt -> {
                    // Resolve track metadata through cross-module API
                    TrackMetadata metadata = mediaModuleApi.getTrackMetadata(pt.getId().getTrackId());
                    Optional<UserPublicProfile> profile = authModuleApi.getUserPublicProfile(metadata.artistId());

                    String artistAlias = profile.map(UserPublicProfile::alias).orElse("Unknown Artist");
                    String artistUsername = profile.map(UserPublicProfile::username).orElse("unknown");

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
                            pt.getAddedAt()
                    );
                });
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
    public java.util.List<PlaylistLibraryProjection> getOwnedPlaylistsForLibrary(UUID userId) {
        return playlistRepository.findOwnedPlaylistsForLibrary(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<PlaylistLibraryProjection> getFollowedPlaylistsForLibrary(UUID userId) {
        return followerRepository.findFollowedPlaylistsForLibrary(userId);
    }

    /**
     * Updates playlist metadata.
     * Guards prevent renaming or altering the core identity of system playlists.
     */
    @Transactional
    public PlaylistDto updatePlaylist(UUID playlistId, UUID userId, String name, String description, Boolean isPublic) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceOwnerAccess(playlist, userId);

        // System playlists like "Liked Tracks" must remain immutable in name/publicity
        if (playlist.getIsSystem()) {
            throw new IllegalArgumentException("System playlists cannot be modified directly.");
        }

        if (name != null && !name.isBlank()) playlist.setName(name);
        if (description != null) playlist.setDescription(description);
        if (isPublic != null) playlist.setIsPublic(isPublic);

        return mapToDto(playlistRepository.save(playlist));
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

        if (playlistTrackRepository.existsById(linkId)) {
            return;
        }

        // Fetch duration from Media module API
        TrackMetadata track = mediaModuleApi.getTrackMetadata(trackId);

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
        playlist.setTotalDurationSeconds(playlist.getTotalDurationSeconds() + track.durationSeconds());
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

    @Transactional
    public PlaylistDto duplicatePlaylist(UUID sourcePlaylistId, UUID newOwnerId) {
        Playlist source = playlistRepository.findById(sourcePlaylistId)
                .orElseThrow(() -> new PlaylistNotFoundException(sourcePlaylistId));

        if (!source.getIsPublic() && !source.getOwnerId().equals(newOwnerId)) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(sourcePlaylistId, newOwnerId);
            if (!isCollaborator) {
                throw new AccessDeniedException("Cannot duplicate a private playlist.");
            }
        }

        Playlist cloned = Playlist.builder()
                .ownerId(newOwnerId)
                .name(source.getName() + " (Copy)")
                .description(source.getDescription())
                .coverMinioPath(source.getCoverMinioPath())
                .isPublic(false) // Clones are private by default
                .isSystem(false)
                .isCollaborative(false)
                .trackCount(source.getTrackCount())
                .totalDurationSeconds(source.getTotalDurationSeconds())
                .build();

        Playlist savedClone = playlistRepository.save(cloned);

        // Bulk insert corresponding tracks
        List<PlaylistTrack> sourceTracks = playlistTrackRepository.findAllByIdPlaylistId(sourcePlaylistId);
        List<PlaylistTrack> clonedTracks = sourceTracks.stream().map(st ->
                PlaylistTrack.builder()
                        .id(new PlaylistTrackId(savedClone.getId(), st.getId().getTrackId()))
                        .addedById(newOwnerId) // The person cloning claims the "added by" identity
                        .positionIndex(st.getPositionIndex())
                        .build()
        ).collect(Collectors.toList());

        playlistTrackRepository.saveAll(clonedTracks);

        events.publishEvent(new PlaylistCopiedEvent(newOwnerId, sourcePlaylistId, savedClone.getId(), Instant.now()));

        return mapToDto(savedClone);
    }

    // --- Social Collaboration Features ---

    @Transactional
    public void addCollaborator(UUID playlistId, UUID ownerId, UUID newCollaboratorId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceOwnerAccess(playlist, ownerId);

        if (!playlist.getIsCollaborative()) {
            throw new IllegalArgumentException("Playlist is not marked as collaborative.");
        }

        PlaylistCollaborator collaborator = PlaylistCollaborator.builder()
                .id(new PlaylistCollaboratorId(playlistId, newCollaboratorId))
                .build();

        collaboratorRepository.save(collaborator);
    }

    @Transactional
    public void removeCollaborator(UUID playlistId, UUID ownerId, UUID collaboratorId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        enforceOwnerAccess(playlist, ownerId);
        collaboratorRepository.deleteById(new PlaylistCollaboratorId(playlistId, collaboratorId));
    }

    @Transactional
    public void followPlaylist(UUID playlistId, UUID userId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        if (!playlist.getIsPublic()) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlistId, userId);
            if (!isCollaborator && !playlist.getOwnerId().equals(userId)) {
                throw new AccessDeniedException("Cannot follow a private playlist.");
            }
        }

        PlaylistFollower follower = PlaylistFollower.builder()
                .id(new PlaylistFollowerId(userId, playlistId))
                .build();

        followerRepository.save(follower);
        events.publishEvent(new PlaylistFollowedEvent(userId, playlistId, Instant.now()));
    }

    @Transactional
    public void unfollowPlaylist(UUID playlistId, UUID userId) {
        followerRepository.deleteById(new PlaylistFollowerId(userId, playlistId));
    }

    // --- Private Guards ---

    private void enforceOwnerAccess(Playlist playlist, UUID userId) {
        if (!playlist.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("Operation restricted to playlist owner.");
        }
    }

    private void enforceModificationAccess(Playlist playlist, UUID userId) {
        if (playlist.getOwnerId().equals(userId)) {
            return;
        }
        if (playlist.getIsCollaborative()) {
            boolean isCollaborator = collaboratorRepository.existsByIdPlaylistIdAndIdUserId(playlist.getId(), userId);
            if (isCollaborator) {
                return;
            }
        }
        throw new AccessDeniedException("Modification access denied. Must be owner or collaborator.");
    }

    private PlaylistDto mapToDto(Playlist playlist) {
        Optional<UserPublicProfile> profile = authModuleApi.getUserPublicProfile(playlist.getOwnerId());
        String ownerAlias = profile.map(UserPublicProfile::alias).orElse("Unknown User");
        String ownerUsername = profile.map(UserPublicProfile::username).orElse("unknown");

        return new PlaylistDto(
                playlist.getId(),
                playlist.getOwnerId(),
                ownerUsername,
                ownerAlias,
                playlist.getName(),
                playlist.getDescription(),
                playlist.getCoverMinioPath(),
                playlist.getIsPublic(),
                playlist.getIsSystem(),
                playlist.getIsCollaborative(),
                playlist.getTrackCount(),
                playlist.getTotalDurationSeconds(),
                playlist.getCreatedAt(),
                playlist.getUpdatedAt()
        );
    }
}