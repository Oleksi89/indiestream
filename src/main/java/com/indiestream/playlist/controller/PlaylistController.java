package com.indiestream.playlist.controller;

import com.indiestream.playlist.dto.PlaylistDto;
import com.indiestream.playlist.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

/**
 * REST controller for managing playlist structures, collaboration, and library integration.
 */
@RestController
@RequestMapping("/api/v1/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;

    public record CreatePlaylistRequest(String name, String description, boolean isPublic, boolean isCollaborative) {
    }

    public record UpdatePlaylistRequest(String name, String description, Boolean isPublic) {
    }

    @PostMapping
    public ResponseEntity<PlaylistDto> createPlaylist(Principal principal, @RequestBody CreatePlaylistRequest request) {
        UUID ownerId = UUID.fromString(principal.getName());
        PlaylistDto playlist = playlistService.createCustomPlaylist(
                ownerId, request.name(), request.description(), request.isPublic(), request.isCollaborative()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(playlist);
    }

    @GetMapping("/{playlistId}")
    public ResponseEntity<PlaylistDto> getPlaylist(@PathVariable UUID playlistId, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(playlistService.getPlaylistById(playlistId, userId));
    }

    @GetMapping("/me/liked")
    public ResponseEntity<PlaylistDto> getMyLikedTracks(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(playlistService.getUserLikedTracksPlaylist(userId));
    }

    @GetMapping("/library")
    public ResponseEntity<Page<PlaylistDto>> getUserLibrary(Principal principal, Pageable pageable) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(playlistService.getUserLibrary(userId, pageable));
    }

    @PostMapping("/{playlistId}/tracks/{trackId}")
    public ResponseEntity<Void> addTrackToPlaylist(
            @PathVariable UUID playlistId,
            @PathVariable UUID trackId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());
        playlistService.addTrackToPlaylist(playlistId, trackId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{playlistId}/tracks/{trackId}")
    public ResponseEntity<Void> removeTrackFromPlaylist(
            @PathVariable UUID playlistId,
            @PathVariable UUID trackId,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        playlistService.removeTrackFromPlaylist(playlistId, trackId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{playlistId}/duplicate")
    public ResponseEntity<PlaylistDto> duplicatePlaylist(
            @PathVariable UUID playlistId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());
        PlaylistDto clonedPlaylist = playlistService.duplicatePlaylist(playlistId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(clonedPlaylist);
    }

    @PutMapping("/{playlistId}")
    public ResponseEntity<PlaylistDto> updatePlaylist(
            @PathVariable UUID playlistId,
            @RequestBody UpdatePlaylistRequest request,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());
        PlaylistDto updated = playlistService.updatePlaylist(
                playlistId, userId, request.name(), request.description(), request.isPublic()
        );
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{playlistId}")
    public ResponseEntity<Void> deletePlaylist(
            @PathVariable UUID playlistId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());
        playlistService.deletePlaylist(playlistId, userId);
        return ResponseEntity.noContent().build();
    }

    // --- Collaboration & Social Endpoints ---

    @PostMapping("/{playlistId}/collaborators/{collaboratorId}")
    public ResponseEntity<Void> addCollaborator(
            @PathVariable UUID playlistId,
            @PathVariable UUID collaboratorId,
            Principal principal) {
        UUID ownerId = UUID.fromString(principal.getName());
        playlistService.addCollaborator(playlistId, ownerId, collaboratorId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{playlistId}/collaborators/{collaboratorId}")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable UUID playlistId,
            @PathVariable UUID collaboratorId,
            Principal principal) {
        UUID ownerId = UUID.fromString(principal.getName());
        playlistService.removeCollaborator(playlistId, ownerId, collaboratorId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{playlistId}/followers")
    public ResponseEntity<Void> followPlaylist(
            @PathVariable UUID playlistId,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        playlistService.followPlaylist(playlistId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{playlistId}/followers")
    public ResponseEntity<Void> unfollowPlaylist(
            @PathVariable UUID playlistId,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        playlistService.unfollowPlaylist(playlistId, userId);
        return ResponseEntity.noContent().build();
    }
}