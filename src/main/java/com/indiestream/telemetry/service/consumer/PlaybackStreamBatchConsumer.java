package com.indiestream.telemetry.service.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiestream.telemetry.config.RedisStreamInitializer;
import com.indiestream.telemetry.domain.PlaybackStatus;
import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import com.indiestream.telemetry.repository.RawPlaybackRecord;
import com.indiestream.telemetry.repository.TelemetryBatchRepository;
import com.indiestream.telemetry.service.LivePulseService;
import com.indiestream.telemetry.service.PlaybackQualityEvaluator;
import com.indiestream.telemetry.service.fraud.FraudGuard;
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
 * Pull-based Batch Consumer for high-throughput playback logs.
 * Guarantees zero data loss by ACKing Redis only AFTER a successful batch DB insert.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlaybackStreamBatchConsumer {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final TelemetryBatchRepository batchRepository;
    private final PlaybackQualityEvaluator qualityEvaluator;
    private final List<FraudGuard> fraudGuards; // Injects all strategy implementations
    private final LivePulseService livePulseService;

    private static final int BATCH_SIZE = 500;
    // Uses the machine's hostname or a random UUID in a real distributed K8s setup
    private final String consumerName = "playback-worker-" + UUID.randomUUID().toString().substring(0, 8);

    @Scheduled(initialDelay = 5000, fixedDelay = 5000)
    @SuppressWarnings("unchecked")
    public void consumeBatch() {
        Consumer consumer = Consumer.from(RedisStreamInitializer.GROUP_TELEMETRY, consumerName);
        StreamReadOptions readOptions = StreamReadOptions.empty().count(BATCH_SIZE).block(Duration.ofMillis(100));
        StreamOffset<String> streamOffset = StreamOffset.create(RedisStreamInitializer.STREAM_PLAYBACK, org.springframework.data.redis.connection.stream.ReadOffset.lastConsumed());

        List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(consumer, readOptions, streamOffset);

        if (records == null || records.isEmpty()) {
            return;
        }

        List<RawPlaybackRecord> batch = new ArrayList<>();
        List<RecordId> processedIds = new ArrayList<>();

        for (MapRecord<String, Object, Object> record : records) {
            try {
                PlaybackTelemetryPayload payload = objectMapper.convertValue(record.getValue(), PlaybackTelemetryPayload.class);
                String userIdStr = (String) record.getValue().get("userId");
                String clientIp = (String) record.getValue().get("clientIp");
                String userAgent = (String) record.getValue().get("userAgent");
                String ingestedAt = (String) record.getValue().get("ingestedAt");

                UUID userId = null;
                if (userIdStr != null && !"null".equals(userIdStr) && !"anonymous".equals(userIdStr) && !"anonymousUser".equals(userIdStr)) {
                    userId = UUID.fromString(userIdStr);
                }

                // 1. Evaluate Quality
                PlaybackStatus status = qualityEvaluator.evaluate(payload);

                // 2. Evaluate Anti-Fraud Strategies
                boolean isBot = fraudGuards.stream()
                        .anyMatch(guard -> guard.isSuspectedBot(payload, userIdStr, clientIp));

                // 3. Update Real-Time Pulse (Only for organic, non-skipped playbacks)
                if (!isBot && status != PlaybackStatus.SKIP) {
                    livePulseService.registerHeartbeat(payload.trackId(), userIdStr != null ? userIdStr : clientIp);
                }

                // 4. Map to Persistence Record
                batch.add(new RawPlaybackRecord(
                        payload.eventId(), userId, payload.trackId(), payload.sessionId(),
                        payload.startPositionMs(), payload.endPositionMs(), payload.playbackDurationMs(),
                        clientIp, userAgent, isBot, status.name(), payload.sourceType(), payload.sourceId(),
                        OffsetDateTime.parse(ingestedAt)
                ));

                processedIds.add(record.getId());

            } catch (Exception e) {
                log.error("Failed to process playback record {}. Routing to DLQ.", record.getId(), e);
                routeToDlq(record, "CONSUMER_PROCESSING_ERROR", e.getMessage());
                // We must ACK the bad record so the consumer doesn't get stuck in a loop
                processedIds.add(record.getId());
            }
        }

        // 5. Execute DB Batch Insert
        if (!batch.isEmpty()) {
            batchRepository.batchInsertPlaybacks(batch);
        }

        // 6. ACK only after successful DB persistence
        if (!processedIds.isEmpty()) {
            redisTemplate.opsForStream().acknowledge(
                    RedisStreamInitializer.STREAM_PLAYBACK,
                    RedisStreamInitializer.GROUP_TELEMETRY,
                    processedIds.toArray(new RecordId[0])
            );
        }
    }

    private void routeToDlq(MapRecord<String, Object, Object> originalRecord, String errorType, String reason) {
        java.util.Map<String, String> dlqData = new java.util.HashMap<>();
        originalRecord.getValue().forEach((k, v) -> dlqData.put(String.valueOf(k), String.valueOf(v)));
        dlqData.put("dlq_reason", reason);
        dlqData.put("dlq_type", errorType);
        redisTemplate.opsForStream().add(RedisStreamInitializer.STREAM_DLQ, dlqData);
    }
}