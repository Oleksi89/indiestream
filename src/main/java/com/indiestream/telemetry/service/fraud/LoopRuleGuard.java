package com.indiestream.telemetry.service.fraud;

import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Prevents users from artificially inflating play counts by looping a single track.
 * Caps credited playbacks to 10 per track per user within a 24-hour rolling window.
 */
@Component
@RequiredArgsConstructor
public class LoopRuleGuard implements FraudGuard {

    private final StringRedisTemplate redisTemplate;

    private static final int MAX_PLAYS_PER_DAY = 10;
    private static final long WINDOW_SECONDS = 86400; // 24 hours

    // Atomic INCR + EXPIRE via Lua to prevent Race Conditions and Zombie Keys
    private static final String LUA_SCRIPT = """
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return count
            """;

    @Override
    public boolean isSuspectedBot(PlaybackTelemetryPayload payload, String userId, String clientIp) {
        if (userId == null || userId.equals("anonymous")) {
            return false; // Loop rules typically target authenticated users attempting payout fraud
        }

        String key = "telemetry:loop:" + userId + ":" + payload.trackId();

        DefaultRedisScript<Long> script = new DefaultRedisScript<>(LUA_SCRIPT, Long.class);
        Long currentPlays = redisTemplate.execute(script, Collections.singletonList(key), String.valueOf(WINDOW_SECONDS));

        return currentPlays != null && currentPlays > MAX_PLAYS_PER_DAY;
    }
}