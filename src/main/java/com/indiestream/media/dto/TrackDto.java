package com.indiestream.media.dto;

import com.indiestream.media.domain.TrackStatus;
import jakarta.validation.Valid;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record TrackDto(
        UUID id,
        UUID artistId,
        String artistUsername,
        String artistAlias,
        String title,
        String minioBucketPath,
        String coverMinioPath,
        Map<String, String> stemsMetadata,
        Integer durationSeconds,
        TrackStatus status,
        String hlsManifestPath,

        // Semantic Metadata
        String genre,
        boolean isExplicit,
        @Valid TrackTagsDto tags,

        Instant createdAt
) {
}