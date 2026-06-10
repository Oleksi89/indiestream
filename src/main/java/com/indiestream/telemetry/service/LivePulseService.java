package com.indiestream.telemetry.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Maintains real-time active listener metrics ("The Pulse").
 * Uses Redis Sorted Sets (ZSET) where the score is the Unix timestamp.
 */
@Service
@RequiredArgsConstructor
public class LivePulseService {

    private final StringRedisTemplate redisTemplate;

    // Listeners are considered active if they sent a telemetry tick within the last 5 minutes
    private static final long ACTIVE_WINDOW_MS = 5 * 60 * 1000;

    /**
     * Registers a heartbeat for a track.
     *
     * @param trackId    The track being played.
     * @param identifier Unique identifier for the listener (UserId or IP).
     */
    public void registerHeartbeat(UUID trackId, String identifier) {
        String key = "pulse:track:" + trackId;
        long now = Instant.now().toEpochMilli();

        // Add or update the listener's timestamp score
        redisTemplate.opsForZSet().add(key, identifier, now);

        // Asynchronously clean up stale entries (older than 5 minutes)
        // In a hyper-scale environment, this cleanup would be offloaded to a background Cron,
        // but for our current scale, piggybacking on the heartbeat is highly efficient O(log(N)).
        redisTemplate.opsForZSet().removeRangeByScore(key, 0, now - ACTIVE_WINDOW_MS);
    }

    /**
     * Counts the number of distinct listeners currently active within the time window.
     * High performance O(log(N)) operation using Redis ZCOUNT.
     *
     * @param trackId The track to check.
     * @return Number of concurrent listeners.
     */
    public long getConcurrentListenersCount(UUID trackId) {
        String key = "pulse:track:" + trackId;
        long now = Instant.now().toEpochMilli();
        long minScore = now - ACTIVE_WINDOW_MS;

        Long count = redisTemplate.opsForZSet().count(key, minScore, now);
        return count != null ? count : 0L;
    }
}