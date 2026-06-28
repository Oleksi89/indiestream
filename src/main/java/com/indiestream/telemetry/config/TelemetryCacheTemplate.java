package com.indiestream.telemetry.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Centralized programmatic cache manager executing the Cache-Aside pattern.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelemetryCacheTemplate {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Retrieves an item from the cache, or computes and stores it if a cache miss occurs.
     *
     * @param key           The deterministic Redis key.
     * @param targetType    The expected return type for JSON deserialization.
     * @param ttl           Time-To-Live duration for the cache entry.
     * @param dbComputation A supplier containing the heavy database query execution.
     * @param <T>           The generic type of the cached object.
     * @return The cached or freshly computed data.
     */
    public <T> T getOrCompute(String key, Class<T> targetType, Duration ttl, Supplier<T> dbComputation) {
        try {
            String cachedData = redisTemplate.opsForValue().get(key);
            if (cachedData != null) {
                // log.info("CACHE HIT: Retrieved {} [Key: {}]", targetType.getSimpleName(), key);
                return objectMapper.readValue(cachedData, targetType);
            }
        } catch (Exception e) {
            log.error("Redis Read Error for key [{}]: {}", key, e.getMessage());
        }

        // log.info("CACHE MISS: Computing {} from Database [Key: {}]", targetType.getSimpleName(), key);
        T computedData = dbComputation.get();

        saveToCache(key, computedData, ttl);

        return computedData;
    }

    private void saveToCache(String key, Object data, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(key, json, ttl);
            // log.info("CACHE PUT: Successfully saved data to Redis [Key: {}]", key);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize data for Redis [Key: {}]", key, e);
        } catch (Exception e) {
            log.error("Redis Write Error for key [{}]: {}", key, e.getMessage());
        }
    }

    /**
     * Removes all keys from Redis that start with the given prefix.
     */
    public void evictByPrefix(String prefix) {
        try {
            Set<String> keys = redisTemplate.keys(prefix + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.error("Error clearing Redis cache for prefix [{}]: {}", prefix, e.getMessage());
        }
    }
}