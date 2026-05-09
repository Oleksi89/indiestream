package com.indiestream.playlist.service;

import com.indiestream.auth.UserRegisteredEvent;
import com.indiestream.media.MediaModuleApi;
import com.indiestream.media.TrackMetadata;
import com.indiestream.media.dto.TrackDto;
import com.indiestream.media.service.TrackService;
import com.indiestream.playlist.domain.Playlist;
import com.indiestream.playlist.domain.PlaylistTrack;
import com.indiestream.playlist.domain.PlaylistTrackId;
import com.indiestream.playlist.dto.PlaylistDto;
import com.indiestream.playlist.event.PlaylistCopiedEvent;
import com.indiestream.playlist.event.TrackAddedToPlaylistEvent;
import com.indiestream.playlist.exception.PlaylistNotFoundException;
import com.indiestream.playlist.repository.PlaylistRepository;
import com.indiestream.playlist.repository.PlaylistTrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final PlaylistTrackRepository playlistTrackRepository;

    // Cross-module strictly defined API call
    private final MediaModuleApi mediaModuleApi;
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
    public PlaylistDto getPlaylistById(UUID playlistId) {
        return playlistRepository.findById(playlistId)
                .map(this::mapToDto)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));
    }


    /**
     * Updates playlist metadata.
     * Guards prevent renaming or altering the core identity of system playlists.
     */
    @Transactional
    public PlaylistDto updatePlaylist(UUID playlistId, UUID userId, String name, String description, Boolean isPublic) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        if (!playlist.getOwnerId().equals(userId)) {
            throw new IllegalArgumentException("Cannot update a playlist you do not own.");
        }

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

        if (!playlist.getOwnerId().equals(userId)) {
            throw new IllegalArgumentException("Cannot delete a playlist you do not own.");
        }
        if (playlist.getIsSystem()) {
            throw new IllegalArgumentException("System playlists cannot be deleted.");
        }

        playlistRepository.delete(playlist);
    }

    /**
     * Removes a track and recalculates aggregates safely using PESSIMISTIC_WRITE.
     */
    @Transactional
    public void removeTrackFromPlaylist(UUID playlistId, UUID trackId, UUID userId) {
        Playlist playlist = playlistRepository.findByIdWithPessimisticWrite(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        if (!playlist.getOwnerId().equals(userId) && !playlist.getIsCollaborative()) {
            throw new IllegalArgumentException("Cannot modify a playlist you do not own.");
        }

        PlaylistTrack link = playlistTrackRepository.findById(new PlaylistTrackId(playlistId, trackId))
                .orElseThrow(() -> new IllegalArgumentException("Track is not in this playlist."));

        // Fetch duration via public API to accurately decrement the total duration
        TrackMetadata track = mediaModuleApi.getTrackMetadata(trackId);

        playlistTrackRepository.delete(link);

        // Update aggregates
        playlist.setTrackCount(Math.max(0, playlist.getTrackCount() - 1));
        playlist.setTotalDurationSeconds(Math.max(0, playlist.getTotalDurationSeconds() - track.durationSeconds()));
        playlistRepository.save(playlist);
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

    /**
     * Adds a track to a playlist with concurrency protection.
     * Uses PESSIMISTIC_WRITE to prevent aggregate count corruption.
     */
    @Transactional
    public void addTrackToPlaylist(UUID playlistId, UUID trackId, UUID userId) {
        Playlist playlist = playlistRepository.findByIdWithPessimisticWrite(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException(playlistId));

        // Basic boundary check (Collaborator access will be expanded in branch 2)
        if (!playlist.getOwnerId().equals(userId) && !playlist.getIsCollaborative()) {
            // TODO: [Security] - Throw custom RFC 7807 AccessDeniedException mapped to 403
            throw new IllegalArgumentException("Cannot modify a playlist you do not own.");
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

        events.publishEvent(new TrackAddedToPlaylistEvent(userId, playlistId, trackId, Instant.now()));
    }

    /**
     * Executes a Deep Copy of a playlist and all its track associations.
     */
    @Transactional
    public PlaylistDto duplicatePlaylist(UUID sourcePlaylistId, UUID newOwnerId) {
        Playlist source = playlistRepository.findById(sourcePlaylistId)
                .orElseThrow(() -> new PlaylistNotFoundException(sourcePlaylistId));

        if (!source.getIsPublic() && !source.getOwnerId().equals(newOwnerId)) {
            throw new IllegalArgumentException("Cannot duplicate a private playlist.");
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

    private PlaylistDto mapToDto(Playlist playlist) {
        return new PlaylistDto(
                playlist.getId(),
                playlist.getOwnerId(),
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