package com.indiestream.playlist.exception;

import java.util.UUID;

public class PlaylistNotFoundException extends RuntimeException {
    public PlaylistNotFoundException(UUID id) {
        super("Playlist with ID " + id + " not found");
    }
}