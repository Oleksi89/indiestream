package com.indiestream.media.moderation.dto;

import com.indiestream.media.catalog.domain.TrackStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight projection for rendering the Admin Moderation Dashboard.
 * Prevents loading massive JSONB and textual fields into memory when fetching lists.
 */
public interface ModerationQueueProjection {
    UUID getId();

    String getTitle();

    UUID getArtistId();

    TrackStatus getStatus();

    boolean getHasAppealed();

    Instant getCreatedAt();
}