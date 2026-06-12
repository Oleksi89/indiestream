package com.indiestream.telemetry.repository;

import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Supplemental repository to handle Admin and Curator specific high-performance queries
 * without bloating the Track-focused AnalyticsQueryRepository.
 */
@Repository
@RequiredArgsConstructor
public class SupplementalAnalyticsQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * Calculates aggregated performance metrics for a specific playlist within a defined time range.
     * Merges historical daily aggregates with real-time hourly statistics for the current day
     * to provide up-to-date analytics.
     *
     * @param playlistId unique identifier of the playlist
     * @param startDate  start date of the aggregation period (inclusive)
     * @param endDate    end date of the aggregation period (inclusive)
     * @return an {@link AggregateMetricsProjection} containing accumulated plays, skips, unique listeners, and likes
     */
    public AggregateMetricsProjection getPlaylistGlobalMetrics(UUID playlistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        String sql = """
            WITH combined_stats AS (
                SELECT plays, skips, unique_listeners, likes FROM playlist_daily_stats 
                WHERE playlist_id = :playlistId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= :endDate
                UNION ALL
                SELECT plays, skips, unique_listeners, likes FROM playlist_hourly_stats 
                WHERE playlist_id = :playlistId AND CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE) AND hour_timestamp <= :endDate
                )            
            SELECT
                COALESCE(SUM(plays), 0) AS total_plays,
                COALESCE(SUM(skips), 0) AS total_skips,
                COALESCE(SUM(unique_listeners), 0) AS unique_listeners,
                COALESCE(SUM(likes), 0) AS total_likes
            FROM combined_stats
            """;

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("playlistId", playlistId).addValue("startDate", startDate).addValue("endDate", endDate);
        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(rs.getLong("total_plays"), rs.getLong("total_skips"), rs.getLong("unique_listeners"), rs.getLong("total_likes")));
    }

    /**
     * Compiles global, platform-wide performance metrics across all tracks for administrative reporting.
     * Utilizes Lambda architecture by combining historical daily tables with active hourly statistics
     * for the current day.
     *
     * @param startDate start date of the reporting window (inclusive)
     * @param endDate   end date of the reporting window (inclusive)
     * @return an {@link AggregateMetricsProjection} representing global totals for plays, skips, unique listeners, and likes
     */
    public AggregateMetricsProjection getPlatformGlobalMetrics(OffsetDateTime startDate, OffsetDateTime endDate) {
        String sql = """
            
                WITH combined_stats AS (
                SELECT plays, skips, unique_listeners, likes FROM track_daily_stats WHERE date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= :endDate
                UNION ALL
                SELECT plays, skips, unique_listeners, likes FROM track_hourly_stats WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE) AND hour_timestamp <= :endDate
            )
            SELECT
                COALESCE(SUM(plays), 0) AS total_plays,
                COALESCE(SUM(skips), 0) AS total_skips,
                COALESCE(SUM(unique_listeners), 0) AS unique_listeners,
                COALESCE(SUM(likes), 0) AS total_likes
            FROM combined_stats
            """;

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("startDate", startDate).addValue("endDate", endDate);
        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(rs.getLong("total_plays"), rs.getLong("total_skips"), rs.getLong("unique_listeners"), rs.getLong("total_likes")));
    }
}