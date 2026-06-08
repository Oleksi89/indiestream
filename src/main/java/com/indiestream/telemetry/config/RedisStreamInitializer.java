package com.indiestream.telemetry.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures Redis Streams and Consumer Groups are initialized on startup.
 * Prevents NOGROUP exceptions when consumers attempt to pull data.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisStreamInitializer {

    private final StringRedisTemplate redisTemplate;

    public static final String STREAM_PLAYBACK = "stream:playback";
    public static final String STREAM_INTERACTIONS = "stream:interactions";
    public static final String STREAM_DLQ = "stream:dlq";

    public static final String GROUP_TELEMETRY = "group:telemetry-workers";

    @EventListener(ApplicationReadyEvent.class)
    public void initializeStreams() {
        createGroupIfNotExists(STREAM_PLAYBACK, GROUP_TELEMETRY);
        createGroupIfNotExists(STREAM_INTERACTIONS, GROUP_TELEMETRY);
    }

    private void createGroupIfNotExists(String streamKey, String groupName) {
        try {
            // Spring Data Redis requires the stream to exist before creating a group.
            // MKSTREAM equivalent behavior:
            if (!Boolean.TRUE.equals(redisTemplate.hasKey(streamKey))) {
                redisTemplate.opsForStream().add(streamKey, java.util.Map.of("_init", "1"));
                log.info("Created missing Redis Stream: {}", streamKey);
            }
            redisTemplate.opsForStream().createGroup(streamKey, ReadOffset.from("0-0"), groupName);
            log.info("Created Consumer Group '{}' for Stream '{}'", groupName, streamKey);
        } catch (RedisSystemException e) {
            // Exception is thrown if the group already exists. We can safely ignore it.
            log.debug("Consumer Group '{}' already exists for Stream '{}'", groupName, streamKey);
        }
    }
}