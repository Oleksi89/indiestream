package com.indiestream.playlist.controller;

import com.indiestream.playlist.dto.PlaylistDto;
import com.indiestream.playlist.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

/**
 * REST controller for managing playlist structures.
 */
@RestController
@RequestMapping("/api/v1/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;

    public record CreatePlaylistRequest(String name, String description, boolean isPublic, boolean isCollaborative) {
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
    public ResponseEntity<PlaylistDto> getPlaylist(@PathVariable UUID playlistId) {
        // TODO: [Playlist] - Apply Social & Visibility Guards for private playlists
        return ResponseEntity.ok(playlistService.getPlaylistById(playlistId));
    }

    @GetMapping("/me/liked")
    public ResponseEntity<PlaylistDto> getMyLikedTracks(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(playlistService.getUserLikedTracksPlaylist(userId));
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

    @PostMapping("/{playlistId}/duplicate")
    public ResponseEntity<PlaylistDto> duplicatePlaylist(
            @PathVariable UUID playlistId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());
        PlaylistDto clonedPlaylist = playlistService.duplicatePlaylist(playlistId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(clonedPlaylist);
    }
}