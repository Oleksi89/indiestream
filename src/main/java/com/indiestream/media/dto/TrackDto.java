package com.indiestream.media.dto;

import java.util.Map;
import java.util.UUID;

public record TrackDto(
        UUID id,
        UUID artistId,
        String title,
        String minioBucketPath,
        Map<String, String> stemsMetadata,
        Integer durationSeconds
) {}