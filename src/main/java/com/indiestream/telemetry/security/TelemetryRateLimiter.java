package com.indiestream.telemetry.security;

import com.indiestream.telemetry.exception.RateLimitExceededException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Manages Token Bucket rate limiting for the Telemetry Ingestion Gateway.
 * Operates entirely in-memory to prevent Redis I/O overhead for pure guardrail checks.
 */
@Slf4j
@Component
public class TelemetryRateLimiter {

    // TODO: [Security/Performance] - Implement a Caffeine cache here instead of ConcurrentHashMap
    // to enable TTL-based eviction of old IP buckets and prevent slow OOM during distributed DDoS.
    private final ConcurrentMap<String, Bucket> cache = new ConcurrentHashMap<>();

    /**
     * Enforces the rate limit constraint. Throws an exception if the bucket is exhausted.
     *
     * @param clientIp The normalized IP address of the incoming request.
     */
    public void enforceRateLimit(String clientIp) {
        Bucket bucket = cache.computeIfAbsent(clientIp, this::createNewBucket);

        if (!bucket.tryConsume(1)) {
            log.warn("Rate limit exceeded for IP: {}", clientIp);
            throw new RateLimitExceededException("Too many telemetry requests. Please slow down buffer flushing.");
        }
    }

    /**
     * Defines the bandwidth limit: 120 requests per minute per IP.
     * Provides a generous buffer for organic spikes while blocking malicious loops.
     */
    private Bucket createNewBucket(String key) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(120)
                        .refillGreedy(120, Duration.ofMinutes(1))
                        .build())
                .build();
    }
}