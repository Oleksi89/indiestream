package com.indiestream.recommendation.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * High-performance vector query engine.
 * Directly interacts with PostgreSQL pgvector using the `<=>` (Cosine Distance) operator.
 * Leverages HNSW indexes to guarantee sub-50ms execution times.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class RecommendationQueryEngine {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * Fetches track UUIDs mathematically closest to the provided vector.
     * Enforces Anti-Fatigue (excluding recently played tracks) and strictly applies
     * the user's specific blocklist (UserBlacklist).
     *
     * @param userId           The requesting user's ID.
     * @param targetVector     The vector (Taste or Playlist Centroid) to match against.
     * @param fatiguedTrackIds List of recently played tracks to exclude (Anti-Fatigue).
     * @param poolSize         Oversampling pool size (e.g., fetch 50 to shuffle down to 20).
     * @return List of recommended track UUIDs.
     */
    public List<UUID> findClosestTracks(UUID userId, float[] targetVector, List<UUID> fatiguedTrackIds, int poolSize) {
        String vectorStr = Arrays.toString(targetVector);

        // Dynamic exclusion clause handling to avoid SQL syntax errors on empty lists
        boolean hasFatigue = fatiguedTrackIds != null && !fatiguedTrackIds.isEmpty();
        String fatigueClause = hasFatigue ? "AND id NOT IN (:fatiguedIds)" : "";

        String sql = String.format("""
                SELECT id 
                FROM tracks
                WHERE status = 'PUBLISHED'
                  %s
                  AND id NOT IN (SELECT track_id FROM user_blacklists WHERE user_id = :userId)
                ORDER BY vector <=> :vector::vector
                LIMIT :poolSize
                """, fatigueClause);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("vector", vectorStr)
                .addValue("userId", userId)
                .addValue("poolSize", poolSize);

        if (hasFatigue) {
            params.addValue("fatiguedIds", fatiguedTrackIds);
        }

        return jdbcTemplate.queryForList(sql, params, UUID.class);
    }

    /**
     * Discovers playlists whose Centroid Vector is mathematically similar to the User's Taste.
     * Implicitly ensures system playlists (is_system = true) are excluded.
     */
    public List<UUID> findClosestPlaylists(UUID userId, float[] tasteVector, int limit) {
        String sql = """
            SELECT id
            FROM playlists
            WHERE is_public = true 
              AND is_system = false
              AND owner_id != :userId
              AND centroid_vector IS NOT NULL
            ORDER BY centroid_vector <=> :vector::vector
            LIMIT :limit
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("vector", Arrays.toString(tasteVector))
                .addValue("userId", userId)
                .addValue("limit", limit);

        return jdbcTemplate.queryForList(sql, params, UUID.class);
    }

    /**
     * Collaborative Filtering Engine (Listeners Like You).
     * Finds users with similar Taste Vectors, then retrieves the tracks they recently added
     * to their 'Liked Tracks' system playlist, ranking them by mutual popularity among peers.
     */
    public List<UUID> findTracksFromSimilarUsers(UUID userId, float[] tasteVector, int limit) {
        String sql = """
            WITH similar_users AS (
                SELECT user_id
                FROM user_profiles
                WHERE user_id != :userId 
                  AND taste_vector IS NOT NULL
                  AND is_private = false
                ORDER BY taste_vector <=> :vector::vector
                LIMIT 5
            )
            SELECT pt.track_id
            FROM playlist_tracks pt
            JOIN playlists p ON pt.playlist_id = p.id
            JOIN similar_users su ON p.owner_id = su.user_id
            JOIN tracks t ON pt.track_id = t.id
            WHERE p.is_system = true
              AND t.status = 'PUBLISHED'
              AND pt.track_id NOT IN (SELECT track_id FROM user_blacklists WHERE user_id = :userId)
            GROUP BY pt.track_id
            ORDER BY COUNT(su.user_id) DESC, MAX(pt.added_at) DESC
            LIMIT :limit
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("vector", Arrays.toString(tasteVector))
                .addValue("userId", userId)
                .addValue("limit", limit);

        return jdbcTemplate.queryForList(sql, params, UUID.class);
    }
}