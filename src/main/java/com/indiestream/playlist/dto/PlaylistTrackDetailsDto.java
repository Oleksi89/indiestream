package com.indiestream.playlist.dto;

import java.time.Instant;
import java.util.UUID;

public record PlaylistTrackDetailsDto(
        UUID trackId,
        String title,
        UUID artistId,
        Integer durationSeconds,
        String coverMinioPath,
        UUID addedByUserId,
        Instant addedAt
) {
}
