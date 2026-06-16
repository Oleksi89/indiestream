package com.indiestream.infrastructure.seeder.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@Profile("seeder")
@RequiredArgsConstructor
public class TelemetrySeederService {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final Random random = new Random();

    private static final int PLAYBACK_COUNT = 3500;
    private static final int INTERACTION_COUNT = 1500;
    private static final String SEED_USER_AGENT = "IndieStream-Seed-TimeMachine";
    private static final String[] COUNTRIES = {"US", "UA", "PL", "GB", "CA", "DE"};

    public void seedHistoricalTelemetry(List<UUID> seedUserIds) {
        log.info("--- PHASE 4: TIME MACHINE TELEMETRY SEEDING ---");

        if (seedUserIds.isEmpty()) {
            log.warn("No seed users available. Aborting Telemetry Seeding.");
            return;
        }

        List<UUID> seedTrackIds = jdbcTemplate.queryForList(
                "SELECT id FROM tracks WHERE artist_id IN (:userIds) AND status = 'PUBLISHED'",
                new MapSqlParameterSource("userIds", seedUserIds),
                UUID.class
        );

        if (seedTrackIds.isEmpty()) {
            log.warn("No seed tracks available. Aborting Telemetry Seeding.");
            return;
        }

        seedPlaybacks(seedUserIds, seedTrackIds);
        seedInteractions(seedUserIds, seedTrackIds);

        log.info("Historical Telemetry Seeding Complete.");
    }

    private void seedPlaybacks(List<UUID> userIds, List<UUID> trackIds) {
        log.info("Generating {} historical playbacks over the last 30 days...", PLAYBACK_COUNT);
        List<MapSqlParameterSource> batchArgs = new ArrayList<>();

        for (int i = 0; i < PLAYBACK_COUNT; i++) {
            UUID trackId = trackIds.get(random.nextInt(trackIds.size()));
            UUID userId = userIds.get(random.nextInt(userIds.size()));
            Instant createdAt = generateRandomTimeInPast30Days();

            // 80% chance of FULL play (3 mins), 20% skip (20 secs)
            boolean isSkip = random.nextDouble() < 0.2;
            int duration = 180000;
            int listenedMs = isSkip ? random.nextInt(20000) : duration;
            String status = isSkip ? "SKIP" : "FULL";

            MapSqlParameterSource params = new MapSqlParameterSource()
                    .addValue("eventId", UUID.randomUUID())
                    .addValue("userId", userId)
                    .addValue("trackId", trackId)
                    .addValue("sessionId", UUID.randomUUID())
                    .addValue("startPositionMs", 0)
                    .addValue("endPositionMs", listenedMs)
                    .addValue("playbackDurationMs", duration)
                    .addValue("clientIp", generateRandomIp())
                    .addValue("userAgent", SEED_USER_AGENT)
                    .addValue("isSuspectedBot", false)
                    .addValue("playbackStatus", status)
                    .addValue("sourceType", "PUBLIC_FEED")
                    .addValue("sourceId", null) // Optional
                    .addValue("clientCountry", COUNTRIES[random.nextInt(COUNTRIES.length)])
                    .addValue("createdAt", createdAt.atOffset(ZoneOffset.UTC));

            batchArgs.add(params);
        }

        jdbcTemplate.batchUpdate("""
                INSERT INTO raw_playback_logs 
                (event_id, user_id, track_id, session_id, start_position_ms, end_position_ms, 
                 playback_duration_ms, client_ip, user_agent, is_suspected_bot, 
                 playback_status, source_type, source_id, client_country, created_at) 
                VALUES (:eventId, :userId, :trackId, :sessionId, :startPositionMs, :endPositionMs, 
                        :playbackDurationMs, :clientIp, :userAgent, :isSuspectedBot, 
                        :playbackStatus, :sourceType, :sourceId, :clientCountry, :createdAt)
                """, batchArgs.toArray(new MapSqlParameterSource[0]));
    }

    private void seedInteractions(List<UUID> userIds, List<UUID> trackIds) {
        log.info("Generating {} historical interactions (Likes)...", INTERACTION_COUNT);
        List<MapSqlParameterSource> batchArgs = new ArrayList<>();

        for (int i = 0; i < INTERACTION_COUNT; i++) {
            MapSqlParameterSource params = new MapSqlParameterSource()
                    .addValue("eventId", UUID.randomUUID())
                    .addValue("userId", userIds.get(random.nextInt(userIds.size())))
                    .addValue("targetId", trackIds.get(random.nextInt(trackIds.size())))
                    .addValue("interactionType", "LIKE")
                    .addValue("sourceType", "PUBLIC_FEED")
                    .addValue("uiSurface", "PLAYER_BAR")
                    .addValue("createdAt", generateRandomTimeInPast30Days().atOffset(ZoneOffset.UTC));

            batchArgs.add(params);
        }

        jdbcTemplate.batchUpdate("""
                INSERT INTO raw_interaction_logs 
                (event_id, user_id, target_id, interaction_type, source_type, ui_surface, created_at) 
                VALUES (:eventId, :userId, :targetId, :interactionType, :sourceType, :uiSurface, :createdAt)
                """, batchArgs.toArray(new MapSqlParameterSource[0]));
    }

    private String generateRandomIp() {
        return String.format("%d.%d.%d.%d",
                random.nextInt(256), random.nextInt(256), random.nextInt(256), random.nextInt(254) + 1);
    }

    private Instant generateRandomTimeInPast30Days() {
        long daysBack = random.nextInt(30);
        long hoursBack = random.nextInt(24);
        long minutesBack = random.nextInt(60);
        return Instant.now()
                .minus(daysBack, ChronoUnit.DAYS)
                .minus(hoursBack, ChronoUnit.HOURS)
                .minus(minutesBack, ChronoUnit.MINUTES);
    }
}