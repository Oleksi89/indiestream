package com.indiestream.playlist;

import java.time.Instant;
import java.util.UUID;

public record PlaylistLibraryProjection(
        UUID id,
        String name,
        String coverMinioPath,
        UUID ownerId,
        Instant addedAt
) {
}