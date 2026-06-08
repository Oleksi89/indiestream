package com.indiestream.telemetry.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * Lightweight L1 In-Memory Cache for Track Durations.
 * Prevents N+1 DB queries and avoids over-fetching heavy TrackMetadata objects.
 * Memory footprint: ~1MB for 10,000 active tracks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrackDurationCache {

    private final MediaModuleApi mediaModuleApi;

    private final Cache<UUID, Integer> cache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofMinutes(30))
            .build();

    /**
     * Fetches the track duration in seconds.
     * Caches only the Integer to optimize heap memory.
     */
    public Integer getDurationSeconds(UUID trackId) {
        return cache.get(trackId, id -> {
            try {
                TrackMetadata metadata = mediaModuleApi.getTrackMetadata(id);
                return (metadata != null) ? metadata.durationSeconds() : null;
            } catch (Exception e) {
                log.warn("Failed to fetch track duration from Media module for track {}: {}", id, e.getMessage());
                return null;
            }
        });
    }
}