package com.indiestream.telemetry.service;

import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.playlist.PlaylistDto;
import com.indiestream.playlist.api.PlaylistModuleApi;
import com.indiestream.telemetry.domain.InteractionType;
import com.indiestream.telemetry.domain.TelemetrySourceType;
import com.indiestream.telemetry.domain.UiSurface;
import com.indiestream.telemetry.dto.InteractionTelemetryPayload;
import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import com.indiestream.telemetry.dto.SimulationReportDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

/**
 * Generates synthetic high-volume traffic to safely E2E test the telemetry pipeline.
 * Bypasses the HTTP layer but hits the exact same Redis Stream Gateway.
 * All events are tagged with a specific User-Agent for easy cleanup.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetrySimulatorService {

    private final TelemetryIngestionGateway gateway;
    private final MediaModuleApi mediaModuleApi;
    private final PlaylistModuleApi playlistModuleApi;
    private final Random random = new Random();
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public static final String SIMULATOR_USER_AGENT = "IndieStream-E2E-Simulator";
    private static final String[] COUNTRIES = {"US", "UA", "PL", "GB", "CA", "DE", "FR", "JP", "BR", "AU"};

    public SimulationReportDto generateShadowTraffic(int playbackEventsCount, UUID targetedUserId, String targetTrackName, String targetPlaylistName) {
        log.info("Initializing Shadow Traffic Simulator. Target Playbacks: {}", playbackEventsCount);

        // Fetch tracks: use specific name if provided, otherwise fetch recent public tracks
        String trackQuery = (targetTrackName != null && !targetTrackName.isBlank()) ? targetTrackName : "";
        List<TrackMetadata> availableTracks = mediaModuleApi.searchPublicTracks(
                trackQuery, "", "", PageRequest.of(0, 50)).getContent();

        // Fetch playlists: use specific name if provided
        String playlistQuery = (targetPlaylistName != null && !targetPlaylistName.isBlank()) ? targetPlaylistName : "";
        List<PlaylistDto> availablePlaylists = playlistModuleApi.searchPublicPlaylists(
                playlistQuery, PageRequest.of(0, 20)).getContent();

        if (availableTracks.isEmpty()) {
            throw new IllegalStateException("Cannot generate traffic: No public tracks found matching query '");
        }

        // Counters for verification report
        int fullPlays = 0, skips = 0, trackLikes = 0, playlistFollows = 0, targetUserHits = 0, interactionsGenerated = 0;
        Map<String, Integer> countryStats = new HashMap<>();
        Map<String, Integer> sourceStats = new HashMap<>();

        for (int i = 0; i < playbackEventsCount; i++) {
            TrackMetadata track = availableTracks.get(random.nextInt(availableTracks.size()));

            // Fuzzing User Identity (20% goes to the admin to fill their personal True History)
            boolean isTargetUser = targetedUserId != null && random.nextDouble() < 0.20;
            String simulatedUserId = isTargetUser ? targetedUserId.toString() : UUID.randomUUID().toString();
            if (isTargetUser) targetUserHits++;

            // Fuzzing Network Context
            String ip = generateRandomIp();
            String country = COUNTRIES[random.nextInt(COUNTRIES.length)];
            countryStats.put(country, countryStats.getOrDefault(country, 0) + 1);

            // Fuzzing Durations and Quality
            int trackDurationMs = track.durationSeconds() * 1000;
            if (trackDurationMs <= 0) trackDurationMs = 180000;

            boolean isSkip = random.nextDouble() < 0.25; // 25% skip rate
            int listenedMs = isSkip
                    ? random.nextInt(Math.min(25000, trackDurationMs / 3))
                    : trackDurationMs - random.nextInt(5000);

            if (isSkip) skips++;
            else fullPlays++;

            // Fuzzing Source Context
            TelemetrySourceType[] sources = TelemetrySourceType.values();
            TelemetrySourceType sourceType = sources[random.nextInt(sources.length)];
            sourceStats.put(sourceType.name(), sourceStats.getOrDefault(sourceType.name(), 0) + 1);

            UUID sourceId = null;
            if (sourceType == TelemetrySourceType.PLAYLIST && !availablePlaylists.isEmpty()) {
                sourceId = availablePlaylists.get(random.nextInt(availablePlaylists.size())).id();
            }

            // 1. Dispatch Playback Event
            PlaybackTelemetryPayload playbackPayload = new PlaybackTelemetryPayload(
                    UUID.randomUUID(), track.id(), UUID.randomUUID(),
                    0, listenedMs, listenedMs,
                    sourceType.name(), sourceId, country
            );
            gateway.ingestPlayback(playbackPayload, simulatedUserId, ip, SIMULATOR_USER_AGENT, country);

            // 2. Dispatch Interaction Event (30% chance listener interacts with the track)
            if (random.nextDouble() < 0.30) {
                InteractionType interactionType = random.nextBoolean() ? InteractionType.LIKE : InteractionType.ADD_TO_PLAYLIST;
                if (interactionType == InteractionType.LIKE) trackLikes++;

                UiSurface[] surfaces = UiSurface.values();
                UiSurface surface = surfaces[random.nextInt(surfaces.length)];

                InteractionTelemetryPayload interactionPayload = new InteractionTelemetryPayload(
                        UUID.randomUUID(), track.id(), interactionType, sourceType, surface
                );
                gateway.ingestInteraction(interactionPayload, simulatedUserId, ip, SIMULATOR_USER_AGENT);
                interactionsGenerated++;
            }
        }

        // 3. Dispatch separate Playlist Follows
        if (!availablePlaylists.isEmpty()) {
            int playlistEvents = playbackEventsCount / 5; // 20% of playback volume
            for (int i = 0; i < playlistEvents; i++) {
                PlaylistDto playlist = availablePlaylists.get(random.nextInt(availablePlaylists.size()));
                InteractionTelemetryPayload followPayload = new InteractionTelemetryPayload(
                        UUID.randomUUID(), playlist.id(), InteractionType.FOLLOW_PLAYLIST,
                        TelemetrySourceType.SEARCH, UiSurface.TRACK_CARD
                );
                gateway.ingestInteraction(followPayload, UUID.randomUUID().toString(), generateRandomIp(), SIMULATOR_USER_AGENT);
                playlistFollows++;
                interactionsGenerated++;
            }
        }

        log.info("Simulation Complete. Dispatched {} playbacks, {} interactions.", playbackEventsCount, interactionsGenerated);

        return new SimulationReportDto(
                playbackEventsCount, interactionsGenerated, fullPlays, skips,
                trackLikes, playlistFollows, targetUserHits, countryStats, sourceStats
        );
    }

    /**
     * Purges E2E shadow traffic generated by this simulator.
     * Uses a subquery to purge interactions safely since raw_interaction_logs lacks a user_agent column.
     */
    public int purgeShadowTraffic(java.time.OffsetDateTime start, java.time.OffsetDateTime end) {
        log.info("Purging shadow traffic between {} and {}", start, end);

        StringBuilder sqlPlaybacks = new StringBuilder("DELETE FROM raw_playback_logs WHERE user_agent = :userAgent");

        // Advanced SQL: Delete interactions for users who were generated by the simulator
        StringBuilder sqlInteractions = new StringBuilder(
                "DELETE FROM raw_interaction_logs WHERE user_id IN (" +
                        "   SELECT DISTINCT user_id FROM raw_playback_logs WHERE user_agent = :userAgent"
        );

        MapSqlParameterSource params = new MapSqlParameterSource("userAgent", SIMULATOR_USER_AGENT);

        if (start != null) {
            sqlPlaybacks.append(" AND created_at >= :start");
            sqlInteractions.append(" AND created_at >= :start");
            params.addValue("start", start);
        }
        if (end != null) {
            sqlPlaybacks.append(" AND created_at <= :end");
            sqlInteractions.append(" AND created_at <= :end");
            params.addValue("end", end);
        }

        sqlInteractions.append(")"); // Close the subquery

        int interactionsDeleted = jdbcTemplate.update(sqlInteractions.toString(), params);
        int playbacksDeleted = jdbcTemplate.update(sqlPlaybacks.toString(), params);

        log.info("Purge complete. Deleted {} playbacks and {} interactions.", playbacksDeleted, interactionsDeleted);
        return playbacksDeleted + interactionsDeleted;
    }

    private String generateRandomIp() {
        return random.nextInt(256) + "." + random.nextInt(256) + "." + random.nextInt(256) + "." + (random.nextInt(254) + 1);
    }
}