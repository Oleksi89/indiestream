package com.indiestream.telemetry.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSourceUtils;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * High-performance persistence layer for telemetry.
 * Bypasses JPA/Hibernate context to execute bulk INSERTS directly via JDBC,
 * preventing memory bloat and I/O bottlenecks during high-throughput consumption.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class TelemetryBatchRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * Executes a batch insert for playback logs.
     * Uses ON CONFLICT DO NOTHING to guarantee idempotency in case of Redis Consumer restarts
     * before an ACK is successfully registered.
     */
    public void batchInsertPlaybacks(List<RawPlaybackRecord> records) {
        if (records == null || records.isEmpty()) {
            return;
        }

        String sql = """
            
                INSERT INTO raw_playback_logs (
                event_id, user_id, track_id, session_id, start_position_ms, 
                end_position_ms, playback_duration_ms, client_ip, user_agent, 
                is_suspected_bot, playback_status, source_type, source_id, created_at
            ) VALUES (
                :eventId, :userId, :trackId, :sessionId, :startPositionMs, 
                :endPositionMs, :playbackDurationMs, :clientIp, :userAgent, 
                :suspectedBot, :playbackStatus, :sourceType, :sourceId, :createdAt
            ) 
            ON CONFLICT (event_id, created_at) DO NOTHING
            """;

        SqlParameterSource[] batchParams = SqlParameterSourceUtils.createBatch(records.toArray());
        int[] results = jdbcTemplate.batchUpdate(sql, batchParams);

        log.debug("Batch inserted {} playback records", results.length);
    }

    /**
     * Executes a batch insert for interaction logs.
     */
    public void batchInsertInteractions(List<RawInteractionRecord> records) {
        if (records == null || records.isEmpty()) {
            return;
        }

        String sql =
                """
            INSERT INTO
                raw_interaction_logs (
                event_id, user_id,
                target_id, interaction_type, 
                source_type,
                ui_surface, created_at
            ) VALUES (
                :eventId, :userId, :targetId, :interactionType, 
                :sourceType, :uiSurface, :createdAt
            ) 
            ON CONFLICT (event_id, created_at) DO NOTHING
            """;

        SqlParameterSource[] batchParams = SqlParameterSourceUtils.createBatch(records.toArray());
        int[] results = jdbcTemplate.batchUpdate(sql, batchParams);

        log.debug("Batch inserted {} interaction records", results.length);
    }
}