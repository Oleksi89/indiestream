package com.indiestream.telemetry.repository;

import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Supplemental repository to handle Admin and Curator specific high-performance queries
 * without bloating the Track-focused AnalyticsQueryRepository.
 */
@Repository
@RequiredArgsConstructor
public class SupplementalAnalyticsQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public AggregateMetricsProjection getPlaylistGlobalMetrics(UUID playlistId, UUID ownerId, LocalDate startDate, LocalDate endDate) {
        String sql = """        
            SELECT 
                COALESCE(SUM(s.plays), 0) AS total_plays,
                COALESCE(SUM(s.skips), 0) AS total_skips,
                COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners,
                COALESCE(SUM(s.likes), 0) AS total_likes
            FROM playlist_daily_stats s
            INNER JOIN playlists p ON s.playlist_id = p.id
            WHERE p.id = :playlistId 
              AND p.owner_id = :ownerId
              AND s.date_timestamp >= :startDate 
              AND s.date_timestamp <= :endDate
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("playlistId", playlistId)
                .addValue("ownerId", ownerId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(
                rs.getLong("total_plays"), rs.getLong("total_skips"),
                rs.getLong("unique_listeners"), rs.getLong("total_likes")
        ));
    }

    public AggregateMetricsProjection getPlatformGlobalMetrics(LocalDate startDate, LocalDate endDate) {
        String sql = """
            SELECT
                COALESCE(SUM(plays), 0) AS total_plays,
                COALESCE(SUM(skips), 0) AS total_skips,
                COALESCE(SUM(unique_listeners), 0) AS unique_listeners,
                COALESCE(SUM(likes), 0) AS total_likes
            FROM track_daily_stats
            WHERE date_timestamp >= :startDate\s
              AND date_timestamp <= :endDate
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(
                rs.getLong("total_plays"), rs.getLong("total_skips"),
                rs.getLong("unique_listeners"), rs.getLong("total_likes")
        ));
    }
}