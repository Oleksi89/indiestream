package com.indiestream.media.api;

import java.time.Instant;
import java.util.UUID;

public record TrackArchivedEvent(
        UUID trackId,
        Instant timestamp
) {
}