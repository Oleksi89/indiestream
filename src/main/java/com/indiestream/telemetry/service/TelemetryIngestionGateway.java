package com.indiestream.telemetry.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiestream.telemetry.dto.InteractionTelemetryPayload;
import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisStreamCommands;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * High-throughput ingestion gateway buffering telemetry payloads into Redis Streams.
 * Protects the underlying PostgreSQL Data Warehouse from I/O spikes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryIngestionGateway {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String STREAM_PLAYBACK = "stream:playback";
    private static final String STREAM_INTERACTIONS = "stream:interactions";
    private static final String STREAM_DLQ = "stream:dlq";

    @CircuitBreaker(name = "redisTelemetry", fallbackMethod = "fallbackPlaybackIngestion")
    public void ingestPlayback(PlaybackTelemetryPayload payload, String userId, String clientIp, String userAgent, String clientCountry) {
        try {
            Map<String, String> recordData = buildEnrichedPayload(payload, userId, clientIp, userAgent);

            // Defensive validation for country code before Redis insertion
            if (clientCountry != null && !clientCountry.isBlank() && !"null".equalsIgnoreCase(clientCountry.trim())) {
                recordData.put("clientCountry", clientCountry.toUpperCase());
            } else {
                recordData.put("clientCountry", "XX");
            }

            pushToStream(STREAM_PLAYBACK, recordData);
        } catch (Exception e) {
            routeToDlq(payload.eventId().toString(), "PLAYBACK", e.getMessage());
        }
    }

    @CircuitBreaker(name = "redisTelemetry", fallbackMethod = "fallbackInteractionIngestion")
    public void ingestInteraction(InteractionTelemetryPayload payload, String userId, String clientIp, String userAgent) {
        try {
            Map<String, String> recordData = buildEnrichedPayload(payload, userId, clientIp, userAgent);
            pushToStream(STREAM_INTERACTIONS, recordData);
        } catch (Exception e) {
            routeToDlq(payload.eventId().toString(), "INTERACTION", e.getMessage());
        }
    }

    private void pushToStream(String streamKey, Map<String, String> data) {
        MapRecord<String, String, String> record = StreamRecords.newRecord()
                .ofStrings(data)
                .withStreamKey(streamKey);
        redisTemplate.opsForStream().add(record.withStreamKey(streamKey), RedisStreamCommands.XAddOptions.maxlen(10000));
    }

    /**
     * Serializes the DTO into a Map<String, String> as required by Redis Streams.
     * Safely omits null values to prevent "null" string poison pills.
     */
    private Map<String, String> buildEnrichedPayload(Object payload, String userId, String clientIp, String userAgent) {
        Map<String, Object> baseMap = objectMapper.convertValue(payload, new TypeReference<>() {
        });
        Map<String, String> enrichedMap = new HashMap<>();

        // Strictly filter out nulls to prevent String.valueOf() from creating "null" strings
        baseMap.forEach((key, value) -> {
            if (value != null) {
                enrichedMap.put(key, String.valueOf(value));
            }
        });

        if (userId != null && !userId.equals("anonymousUser") && !userId.equals("anonymous")) {
            enrichedMap.put("userId", userId);
        }

        enrichedMap.put("clientIp", clientIp != null ? clientIp : "UNKNOWN");
        enrichedMap.put("userAgent", userAgent != null ? userAgent : "UNKNOWN");
        enrichedMap.put("ingestedAt", Instant.now().toString());

        return enrichedMap;
    }

    private void routeToDlq(String eventId, String type, String errorReason) {
        log.error("Failed to serialize telemetry payload. Routing to DLQ. Event ID: {}, Reason: {}", eventId, errorReason);
        Map<String, String> dlqData = new HashMap<>();
        dlqData.put("eventId", eventId);
        dlqData.put("type", type);
        dlqData.put("error", errorReason);
        dlqData.put("timestamp", Instant.now().toString());

        pushToStream(STREAM_DLQ, dlqData);
    }

    // --- Circuit Breaker Fallbacks ---
    // These ensure that if Redis is offline, the client does not receive an HTTP 500.
    // Telemetry is silently dropped (Fail-Safe), preserving the core user playback experience.

    public void fallbackPlaybackIngestion(PlaybackTelemetryPayload payload, String userId, String clientIp, String userAgent, String clientCountry, Throwable t) {
        log.warn("[Circuit Breaker] Redis unavailable. Dropping playback telemetry for event: {}. Reason: {}", payload.eventId(), t.getMessage());
    }

    public void fallbackInteractionIngestion(InteractionTelemetryPayload payload, String userId, String clientIp, String userAgent, Throwable t) {
        log.warn("[Circuit Breaker] Redis unavailable. Dropping interaction telemetry for event: {}. Reason: {}", payload.eventId(), t.getMessage());
    }
}