package com.indiestream.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Manages the lifecycle of invalidated JWTs.
 * Essential for terminating user sessions in our stateless architecture.
 */
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";
    private final StringRedisTemplate redisTemplate;

    /**
     * Adds a token to the blacklist with a specific Time-To-Live (TTL).
     *
     * @param token The raw JWT string.
     * @param remainingValidity The exact time remaining until the token expires naturally.
     */
    public void blacklistToken(String token, Duration remainingValidity) {
        // We set the Redis TTL exactly to the token's remaining validity.
        // Once the token expires naturally, it becomes invalid cryptographically,
        // so we don't need to waste Redis RAM storing it indefinitely.
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "revoked", remainingValidity);
    }

    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }
}