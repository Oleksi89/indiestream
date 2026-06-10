package com.indiestream.telemetry.repository.projection;

import java.util.UUID;

public record TopTrackProjection(
        UUID trackId,
        String title,
        String coverMinioPath,
        long plays,
        long skips,
        long uniqueListeners
) {
}