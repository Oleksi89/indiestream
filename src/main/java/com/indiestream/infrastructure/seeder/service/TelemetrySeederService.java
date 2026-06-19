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

    private static final String SEED_USER_AGENT = "IndieStream-Seed-TimeMachine";
    private static final String[] COUNTRIES = {"US", "UA", "PL", "GB", "CA", "DE"};

    public void seedHistoricalTelemetry(List<UUID> seedUserIds, int playbackCount, int interactionCount) {
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

        List<UUID> seedPlaylistIds = jdbcTemplate.queryForList(
                "SELECT id FROM playlists WHERE owner_id IN (:userIds)",
                new MapSqlParameterSource("userIds", seedUserIds),
                UUID.class
        );

        seedPlaybacks(seedUserIds, seedTrackIds, seedPlaylistIds, playbackCount);
        seedInteractions(seedUserIds, seedTrackIds, seedPlaylistIds, interactionCount);

        log.info("Historical Telemetry Seeding Complete.");
    }

    private void seedPlaybacks(List<UUID> userIds, List<UUID> trackIds, List<UUID> playlistIds, int playbackCount) {
        log.info("Generating {} historical playbacks over the last 30 days...", playbackCount);
        List<MapSqlParameterSource> batchArgs = new ArrayList<>();

        for (int i = 0; i < playbackCount; i++) {
            UUID trackId = trackIds.get(random.nextInt(trackIds.size()));
            UUID userId = userIds.get(random.nextInt(userIds.size()));
            Instant createdAt = generateRandomTimeInPast30Days();

            // Source generation
            boolean isPlaylistSource = random.nextBoolean() && !playlistIds.isEmpty();
            String sourceType = isPlaylistSource ? "PLAYLIST" : "PUBLIC_FEED";
            UUID sourceId = isPlaylistSource ? playlistIds.get(random.nextInt(playlistIds.size())) : null;

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
                    .addValue("sourceType", sourceType)
                    .addValue("sourceId", sourceId)
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

    private void seedInteractions(List<UUID> userIds, List<UUID> trackIds, List<UUID> playlistIds, int interactionCount) {
        log.info("Generating {} historical interactions...", interactionCount);
        List<MapSqlParameterSource> batchArgs = new ArrayList<>();

        for (int i = 0; i < interactionCount; i++) {
            UUID userId = userIds.get(random.nextInt(userIds.size()));
            Instant createdAt = generateRandomTimeInPast30Days();

            UUID targetId;
            String interactionType;
            String sourceType;
            String uiSurface;

            if (random.nextDouble() < 0.75 || playlistIds.isEmpty()) {
                // 75% Track Likes
                targetId = trackIds.get(random.nextInt(trackIds.size()));
                interactionType = "LIKE";
                uiSurface = "PLAYER_BAR";
                sourceType = (random.nextBoolean() && !playlistIds.isEmpty()) ? "PLAYLIST" : "PUBLIC_FEED";
            } else {
                // 25% Playlist Follows
                targetId = playlistIds.get(random.nextInt(playlistIds.size()));
                interactionType = "FOLLOW_PLAYLIST";
                uiSurface = "CONTEXT_MENU";
                sourceType = "PUBLIC_FEED"; // Generic entry point for playlist follows
            }

            MapSqlParameterSource params = new MapSqlParameterSource()
                    .addValue("eventId", UUID.randomUUID())
                    .addValue("userId", userId)
                    .addValue("targetId", targetId)
                    .addValue("interactionType", interactionType)
                    .addValue("sourceType", sourceType)
                    .addValue("uiSurface", uiSurface)
                    .addValue("createdAt", createdAt.atOffset(ZoneOffset.UTC));

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