package com.indiestream.infrastructure.seeder.service;

import com.indiestream.media.storage.service.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Enterprise-grade Non-Destructive Teardown Engine.
 * Explicitly isolates and purges only the data associated with the `@seed.indiestream.local` namespace.
 * Uses high-performance native JDBC batching to bypass JPA overhead during mass deletions.
 */
@Slf4j
@Service
@Profile("seeder")
@RequiredArgsConstructor
public class SeederCleanupService {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final MinioStorageService minioStorageService;

    public static final String SEED_NAMESPACE = "%@seed.indiestream.local";

    @Transactional
    public void executeNamespaceTeardown() {
        log.warn("INITIATING NAMESPACE TEARDOWN FOR: {}", SEED_NAMESPACE);

        // 1. Identify Seed Users
        List<UUID> seedUserIds = jdbcTemplate.queryForList(
                "SELECT id FROM users WHERE email LIKE :namespace",
                new MapSqlParameterSource("namespace", SEED_NAMESPACE),
                UUID.class
        );

        if (seedUserIds.isEmpty()) {
            log.info("No seed users found. Teardown aborted cleanly.");
            return;
        }

        MapSqlParameterSource userParams = new MapSqlParameterSource("userIds", seedUserIds);

        // 2. Identify Seed Tracks
        List<UUID> seedTrackIds = jdbcTemplate.queryForList(
                "SELECT id FROM tracks WHERE artist_id IN (:userIds)",
                userParams,
                UUID.class
        );

        // 3. Purge Physical Media (MinIO)
        if (!seedTrackIds.isEmpty()) {
            log.info("Purging physical media blobs from MinIO for {} tracks...", seedTrackIds.size());
            List<Map<String, Object>> mediaPaths = jdbcTemplate.queryForList(
                    "SELECT minio_bucket_path, cover_minio_path FROM tracks WHERE id IN (:trackIds)",
                    new MapSqlParameterSource("trackIds", seedTrackIds)
            );

            for (Map<String, Object> row : mediaPaths) {
                try {
                    String audioPath = (String) row.get("minio_bucket_path");
                    String coverPath = (String) row.get("cover_minio_path");
                    // Best-effort cleanup. We catch exceptions so DB teardown continues even if S3 fails.
                    if (audioPath != null) minioStorageService.deleteFile(audioPath);
                    if (coverPath != null) minioStorageService.deleteFile(coverPath);
                } catch (Exception e) {
                    log.error("Failed to delete blob from MinIO during teardown: {}", e.getMessage());
                }
            }
        }

        // 4. Purge Telemetry & Interactions (Child tables first)
        if (!seedTrackIds.isEmpty()) {
            log.info("Purging Telemetry and Tracking aggregates...");
            MapSqlParameterSource trackParams = new MapSqlParameterSource("trackIds", seedTrackIds);

            // Playbacks & Interactions
            jdbcTemplate.update("DELETE FROM raw_playback_logs WHERE track_id IN (:trackIds) OR user_id IN (:userIds)",
                    new MapSqlParameterSource("trackIds", seedTrackIds).addValue("userIds", seedUserIds));
            jdbcTemplate.update("DELETE FROM raw_interaction_logs WHERE user_id IN (:userIds) OR target_id IN (:trackIds)",
                    new MapSqlParameterSource("trackIds", seedTrackIds).addValue("userIds", seedUserIds));

            // Aggregates
            jdbcTemplate.update("DELETE FROM track_hourly_stats WHERE track_id IN (:trackIds)", trackParams);
            jdbcTemplate.update("DELETE FROM track_daily_stats WHERE track_id IN (:trackIds)", trackParams);
            jdbcTemplate.update("DELETE FROM track_daily_demographics WHERE track_id IN (:trackIds)", trackParams);
            jdbcTemplate.update("DELETE FROM track_daily_sources WHERE track_id IN (:trackIds)", trackParams);

            // Recommender specific
            jdbcTemplate.update("DELETE FROM user_blacklists WHERE track_id IN (:trackIds) OR user_id IN (:userIds)",
                    new MapSqlParameterSource("trackIds", seedTrackIds).addValue("userIds", seedUserIds));
        }

        // 5. Purge Playlists
        List<UUID> seedPlaylistIds = jdbcTemplate.queryForList(
                "SELECT id FROM playlists WHERE owner_id IN (:userIds)",
                userParams,
                UUID.class
        );

        if (!seedPlaylistIds.isEmpty()) {
            log.info("Purging social playlist data and covers...");
            MapSqlParameterSource playlistParams = new MapSqlParameterSource("playlistIds", seedPlaylistIds);

            // Delete Playlist Covers from MinIO
            List<String> playlistCovers = jdbcTemplate.queryForList(
                    "SELECT cover_minio_path FROM playlists WHERE id IN (:playlistIds) AND cover_minio_path IS NOT NULL",
                    playlistParams, String.class
            );

            for (String coverPath : playlistCovers) {
                try {
                    minioStorageService.deleteFile(coverPath);
                } catch (Exception e) {
                    log.error("Failed to delete playlist cover from MinIO: {}", e.getMessage());
                }
            }

            jdbcTemplate.update("DELETE FROM raw_interaction_logs WHERE target_id IN (:playlistIds)", playlistParams);
            jdbcTemplate.update("DELETE FROM playlist_hourly_stats WHERE playlist_id IN (:playlistIds)", playlistParams);

            try { // Fail-safe in case daily stats table isn't created yet
                jdbcTemplate.update("DELETE FROM playlist_daily_stats WHERE playlist_id IN (:playlistIds)", playlistParams);
            } catch (Exception ignored) {
            }

            jdbcTemplate.update("DELETE FROM playlist_tracks WHERE playlist_id IN (:playlistIds)", playlistParams);
            jdbcTemplate.update("DELETE FROM playlist_followers WHERE playlist_id IN (:playlistIds)", playlistParams);
            jdbcTemplate.update("DELETE FROM playlist_collaborators WHERE playlist_id IN (:playlistIds)", playlistParams);

            jdbcTemplate.update("DELETE FROM playlists WHERE id IN (:playlistIds)", playlistParams);
        }

        // 6. Purge Core Entities
        log.info("Purging core tracks and user accounts...");
        if (!seedTrackIds.isEmpty()) {
            // Also clear playlist tracks that contain seed tracks but belong to real users
            jdbcTemplate.update("DELETE FROM playlist_tracks WHERE track_id IN (:trackIds)", new MapSqlParameterSource("trackIds", seedTrackIds));
            jdbcTemplate.update("DELETE FROM tracks WHERE id IN (:trackIds)", new MapSqlParameterSource("trackIds", seedTrackIds));
        }

        jdbcTemplate.update("DELETE FROM user_followers WHERE follower_id IN (:userIds) OR followed_id IN (:userIds)", userParams);
        jdbcTemplate.update("DELETE FROM user_moderation_logs WHERE user_id IN (:userIds)", userParams);
        jdbcTemplate.update("DELETE FROM user_profiles WHERE user_id IN (:userIds)", userParams);
        jdbcTemplate.update("DELETE FROM users WHERE id IN (:userIds)", userParams);

        log.info("TEARDOWN COMPLETE. Successfully erased {} seed users and their associated ecosystem footprint.", seedUserIds.size());
    }
}