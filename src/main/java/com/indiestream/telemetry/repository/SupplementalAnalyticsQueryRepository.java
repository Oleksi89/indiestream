package com.indiestream.telemetry.repository;

import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
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
     * Calculates aggregated performance metrics for a specific playlist.
     * Prevents Count-Distinct inflation by evaluating unique listeners directly from raw logs.
     *
     * @param playlistId unique identifier of the playlist
     * @param startDate  start date of the aggregation period (inclusive)
     * @param endDate    end date of the aggregation period (inclusive)
     * @return an {@link AggregateMetricsProjection} containing accumulated plays, skips, unique listeners, and likes
     */
    public AggregateMetricsProjection getPlaylistGlobalMetrics(UUID playlistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        boolean isHourly = ChronoUnit.HOURS.between(startDate, endDate) <= 48;
        String sql;

        if (isHourly) {
            sql = """
                WITH stats AS (
                    SELECT COALESCE(SUM(plays), 0) AS plays, COALESCE(SUM(skips), 0) AS skips, COALESCE(SUM(likes), 0) AS likes
                    FROM playlist_hourly_stats
                    WHERE playlist_id = :playlistId AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                ),
                uniques AS (
                    SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                    FROM raw_playback_logs
                    WHERE source_type = 'PLAYLIST' AND source_id = :playlistId
                      AND created_at >= :startDate AND created_at <= :endDate
                      AND playback_status IN ('FULL', 'PARTIAL') AND is_suspected_bot = false
                )
                SELECT s.plays AS total_plays, s.skips AS total_skips, u.listeners AS unique_listeners, s.likes AS total_likes
                FROM stats s CROSS JOIN uniques u
                """;
        } else {
            sql = """
                    WITH combined_stats AS (
                        SELECT plays, skips, likes FROM playlist_daily_stats
                        WHERE playlist_id = :playlistId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                        UNION ALL
                        SELECT plays, skips, likes FROM playlist_hourly_stats
                        WHERE playlist_id = :playlistId AND CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                          AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                    ),
                    uniques AS (
                        SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                        FROM raw_playback_logs
                        WHERE source_type = 'PLAYLIST' AND source_id = :playlistId
                          AND created_at >= :startDate AND created_at <= :endDate
                          AND playback_status IN ('FULL', 'PARTIAL') AND is_suspected_bot = false
                    )
                    SELECT COALESCE(SUM(c.plays), 0) AS total_plays, COALESCE(SUM(c.skips), 0) AS total_skips, MAX(u.listeners) AS unique_listeners, COALESCE(SUM(c.likes), 0) AS total_likes
                    FROM combined_stats c CROSS JOIN uniques u
                    """;
        }

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("playlistId", playlistId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(
                rs.getLong("total_plays"), rs.getLong("total_skips"),
                rs.getLong("unique_listeners"), rs.getLong("total_likes")
        ));
    }

    /**
     * Compiles global, platform-wide performance metrics.
     * Integrates hybrid historical aggregation with precise real-time raw data bounds.
     *
     * @param startDate start date of the reporting window (inclusive)
     * @param endDate   end date of the reporting window (inclusive)
     * @return an {@link AggregateMetricsProjection} representing global totals for plays, skips, unique listeners, and likes
     */
    public AggregateMetricsProjection getPlatformGlobalMetrics(OffsetDateTime startDate, OffsetDateTime endDate) {
        boolean isHourly = ChronoUnit.HOURS.between(startDate, endDate) <= 48;
        String sql;

        if (isHourly) {
            sql = """
                WITH stats AS (
                    SELECT COALESCE(SUM(plays), 0) AS plays, COALESCE(SUM(skips), 0) AS skips, COALESCE(SUM(likes), 0) AS likes
                    FROM track_hourly_stats
                    WHERE hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                ),
                uniques AS (
                    SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                    FROM raw_playback_logs
                    WHERE created_at >= :startDate AND created_at <= :endDate
                      AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                )
                SELECT s.plays AS total_plays, s.skips AS total_skips, u.listeners AS unique_listeners, s.likes AS total_likes
                FROM stats s CROSS JOIN uniques u
                """;
        } else {
            sql = """
                    WITH combined_stats AS (
                        SELECT plays, skips, likes FROM track_daily_stats
                        WHERE date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                        UNION ALL
                        SELECT plays, skips, likes FROM track_hourly_stats
                        WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                          AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                    ),
                    uniques AS (
                        SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                        FROM raw_playback_logs
                        WHERE created_at >= :startDate AND created_at <= :endDate
                          AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                    )
                    SELECT COALESCE(SUM(c.plays), 0) AS total_plays, COALESCE(SUM(c.skips), 0) AS total_skips, MAX(u.listeners) AS unique_listeners, COALESCE(SUM(c.likes), 0) AS total_likes
                    FROM combined_stats c CROSS JOIN uniques u
                    """;
        }

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(
                rs.getLong("total_plays"), rs.getLong("total_skips"),
                rs.getLong("unique_listeners"), rs.getLong("total_likes")
        ));
    }
}