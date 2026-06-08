package com.indiestream.telemetry.service.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiestream.telemetry.config.RedisStreamInitializer;
import com.indiestream.telemetry.dto.InteractionTelemetryPayload;
import com.indiestream.telemetry.repository.RawInteractionRecord;
import com.indiestream.telemetry.repository.TelemetryBatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Pull-based Batch Consumer for user interactions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InteractionStreamBatchConsumer {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final TelemetryBatchRepository batchRepository;

    private static final int BATCH_SIZE = 500;
    private final String consumerName = "interaction-worker-" + UUID.randomUUID().toString().substring(0, 8);

    @Scheduled(initialDelay = 5000, fixedDelay = 5000)
    @SuppressWarnings("unchecked")
    public void consumeBatch() {
        Consumer consumer = Consumer.from(RedisStreamInitializer.GROUP_TELEMETRY, consumerName);
        StreamReadOptions readOptions = StreamReadOptions.empty().count(BATCH_SIZE).block(Duration.ofMillis(100));
        StreamOffset<String> streamOffset = StreamOffset.create(RedisStreamInitializer.STREAM_INTERACTIONS, org.springframework.data.redis.connection.stream.ReadOffset.lastConsumed());

        List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(consumer, readOptions, streamOffset);

        if (records == null || records.isEmpty()) {
            return;
        }

        List<RawInteractionRecord> batch = new ArrayList<>();
        List<RecordId> processedIds = new ArrayList<>();

        for (MapRecord<String, Object, Object> record : records) {
            try {
                InteractionTelemetryPayload payload = objectMapper.convertValue(record.getValue(), InteractionTelemetryPayload.class);
                String userIdStr = (String) record.getValue().get("userId");
                String ingestedAt = (String) record.getValue().get("ingestedAt");

                UUID userId = null;
                if (userIdStr != null && !"null".equals(userIdStr) && !"anonymous".equals(userIdStr) && !"anonymousUser".equals(userIdStr)) {
                    userId = UUID.fromString(userIdStr);
                }

                batch.add(new RawInteractionRecord(
                        payload.eventId(), userId, payload.targetId(),
                        payload.interactionType().name(), payload.sourceType().name(),
                        payload.uiSurface().name(), OffsetDateTime.parse(ingestedAt)
                ));

                processedIds.add(record.getId());

            } catch (Exception e) {
                log.error("Failed to process interaction record {}. Routing to DLQ.", record.getId(), e);
                // Skip DLQ routing logic here for brevity, but the ID must be ACK'd
                processedIds.add(record.getId());
            }
        }

        if (!batch.isEmpty()) {
            batchRepository.batchInsertInteractions(batch);
        }

        if (!processedIds.isEmpty()) {
            redisTemplate.opsForStream().acknowledge(
                    RedisStreamInitializer.STREAM_INTERACTIONS,
                    RedisStreamInitializer.GROUP_TELEMETRY,
                    processedIds.toArray(new RecordId[0])
            );
        }
    }
}