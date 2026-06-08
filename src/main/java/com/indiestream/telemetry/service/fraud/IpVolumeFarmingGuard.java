package com.indiestream.telemetry.service.fraud;

import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Detects Streaming Farms by measuring the total volume of audio consumed by an IP address.
 * If an IP consumes more than 16 hours of audio within a 24-hour window, it is flagged as a bot.
 */
@Component
@RequiredArgsConstructor
public class IpVolumeFarmingGuard implements FraudGuard {

    private final StringRedisTemplate redisTemplate;

    // 16 hours in milliseconds
    private static final long MAX_MS_PER_DAY = 16L * 60 * 60 * 1000;
    private static final long WINDOW_SECONDS = 86400; // 24 hours

    // Atomic INCRBY + EXPIRE
    private static final String LUA_SCRIPT = """
            local vol = redis.call('INCRBY', KEYS[1], ARGV[1])
            if redis.call('TTL', KEYS[1]) == -1 then
                redis.call('EXPIRE', KEYS[1], ARGV[2])
            end
            return vol
            """;

    @Override
    public boolean isSuspectedBot(PlaybackTelemetryPayload payload, String userId, String clientIp) {
        if (clientIp == null || clientIp.equals("UNKNOWN")) {
            return false;
        }

        String key = "telemetry:farm:ip:" + clientIp;

        DefaultRedisScript<Long> script = new DefaultRedisScript<>(LUA_SCRIPT, Long.class);
        Long totalMs = redisTemplate.execute(
                script,
                Collections.singletonList(key),
                String.valueOf(payload.playbackDurationMs()),
                String.valueOf(WINDOW_SECONDS)
        );

        return totalMs != null && totalMs > MAX_MS_PER_DAY;
    }
}