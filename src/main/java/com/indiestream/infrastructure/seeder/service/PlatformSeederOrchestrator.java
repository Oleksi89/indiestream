package com.indiestream.infrastructure.seeder.service;

import com.indiestream.media.api.ArtistModuleApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@Profile("seeder")
@RequiredArgsConstructor
public class PlatformSeederOrchestrator {

    private final UserSeederService userSeederService;
    private final MediaSeederService mediaSeederService;
    private final PlaylistSeederService playlistSeederService;
    private final TelemetrySeederService telemetrySeederService;

    private final ArtistModuleApi artistModuleApi;
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public static final String SEED_NAMESPACE = "%@seed.indiestream.local";

    public void executeIngestionPhase() {
        log.info("--- STARTING SEEDER PHASE 1: INGESTION ---");

        userSeederService.seedUsers();

        List<UUID> artistIds = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE email LIKE :ns AND role = 'ARTIST'",
                new MapSqlParameterSource("ns", SEED_NAMESPACE), UUID.class);

        mediaSeederService.seedMedia(artistIds);

        log.info("PHASE 1 COMPLETE. Please wait for the background AI pipeline to analyze the audio before running Phase 2.");
    }

    public int executePublishPhase() {
        log.info("--- STARTING SEEDER PHASE 2: PUBLISHING ---");

        List<UUID> artistIds = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE email LIKE :ns AND role = 'ARTIST'",
                new MapSqlParameterSource("ns", SEED_NAMESPACE), UUID.class);

        if (artistIds.isEmpty()) {
            log.warn("No seed artists found.");
            return 0;
        }

        // Fetch tracks that have successfully cleared the AI & Review pipelines
        List<Map<String, Object>> tracks = jdbcTemplate.queryForList(
                "SELECT id, artist_id FROM tracks WHERE artist_id IN (:artists) AND status IN ('APPROVED', 'READY')",
                new MapSqlParameterSource("artists", artistIds));

        int publishedCount = 0;
        for (Map<String, Object> row : tracks) {
            UUID trackId = (UUID) row.get("id");
            UUID artistId = (UUID) row.get("artist_id");
            try {
                artistModuleApi.publishTrack(trackId, artistId);
                publishedCount++;
            } catch (Exception e) {
                log.error("Failed to publish seed track {}: {}", trackId, e.getMessage());
            }
        }

        log.info("PHASE 2 COMPLETE. Successfully force-published {} seed tracks.", publishedCount);
        return publishedCount;
    }

    public void executeSimulationPhase() {
        log.info("--- STARTING SEEDER PHASE 3: PLAYLISTS & TELEMETRY ---");

        List<UUID> listenerIds = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE email LIKE :ns AND role = 'USER'",
                new MapSqlParameterSource("ns", SEED_NAMESPACE), UUID.class);

        List<UUID> allUsers = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE email LIKE :ns",
                new MapSqlParameterSource("ns", SEED_NAMESPACE), UUID.class);

        List<UUID> artistIds = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE email LIKE :ns AND role = 'ARTIST'",
                new MapSqlParameterSource("ns", SEED_NAMESPACE), UUID.class);

        if (artistIds.isEmpty() || listenerIds.isEmpty()) {
            log.warn("Missing seed users. Run Phase 1 first.");
            return;
        }

        // Strictly interact only with fully PUBLISHED tracks
        List<UUID> publishedTracks = jdbcTemplate.queryForList(
                "SELECT id FROM tracks WHERE artist_id IN (:artists) AND status = 'PUBLISHED'",
                new MapSqlParameterSource("artists", artistIds), UUID.class);

        if (publishedTracks.isEmpty()) {
            log.warn("No PUBLISHED seed tracks found. Run Phase 2 first, or wait for tracks to be approved.");
            return;
        }

        playlistSeederService.seedPlaylists(listenerIds, publishedTracks);
        telemetrySeederService.seedHistoricalTelemetry(allUsers);

        log.info("PHASE 3 COMPLETE. Platform is fully hydrated!");
    }
}