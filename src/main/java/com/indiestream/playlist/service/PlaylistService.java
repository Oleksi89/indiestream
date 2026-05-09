package com.indiestream.playlist.service;

import com.indiestream.auth.UserRegisteredEvent;
import com.indiestream.playlist.domain.Playlist;
import com.indiestream.playlist.dto.PlaylistDto;
import com.indiestream.playlist.exception.PlaylistNotFoundException;
import com.indiestream.playlist.repository.PlaylistRepository;
import com.indiestream.playlist.repository.PlaylistTrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final PlaylistTrackRepository playlistTrackRepository;

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
     * Retrieves the protected system playlist for a user.
     * Prevents UI components from needing to know the exact UUID of the "Liked Tracks" playlist.
     */
    @Transactional(readOnly = true)
    public PlaylistDto getUserLikedTracksPlaylist(UUID userId) {
        return playlistRepository.findByOwnerIdAndIsSystemTrue(userId)
                .map(this::mapToDto)
                .orElseThrow(() -> new IllegalStateException("System playlist missing for user " + userId));
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