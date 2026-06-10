package com.indiestream.telemetry.repository;

import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import com.indiestream.telemetry.repository.projection.AttributionProjection;
import com.indiestream.telemetry.repository.projection.TimeSeriesProjection;
import com.indiestream.telemetry.repository.projection.TopTrackProjection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * High-performance CQRS Read Model Repository.
 * Strictly bypasses JPA to execute optimized, natively grouped SQL queries.
 * Every query includes hardcoded IDOR boundaries enforcing ownership joins.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class AnalyticsQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * Calculates the global aggregated metrics for an entire artist's catalog over a specific period.
     * Uses track_daily_stats for extreme performance (millisecond response time).
     */
    public AggregateMetricsProjection getArtistGlobalMetrics(UUID artistId, LocalDate startDate, LocalDate endDate) {
        String sql = """            
            SELECT
                COALESCE(SUM(s.plays), 0) AS total_plays,
                COALESCE(SUM(s.skips), 0) AS total_skips,
                COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners,
                COALESCE(SUM(s.likes), 0) AS total_likes
            FROM track_daily_stats s
            INNER JOIN tracks t ON s.track_id = t.id
            WHERE t.artist_id = :artistId
              AND s.date_timestamp >= :startDate
              AND s.date_timestamp <= :endDate
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("artistId", artistId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(
                rs.getLong("total_plays"),
                rs.getLong("total_skips"),
                rs.getLong("unique_listeners"),
                rs.getLong("total_likes")
        ));
    }

    /**
     * Identifies the top performing tracks for an artist.
     */
    public List<TopTrackProjection> getTopTracksForArtist(UUID artistId, LocalDate startDate, LocalDate endDate, int limit) {
        String sql = """
              SELECT 
                  t.id AS track_id,\s
                  t.title,\s
                  t.cover_minio_path,
                  COALESCE(SUM(s.plays), 0) AS plays,
                  COALESCE(SUM(s.skips), 0) AS skips,
                  COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners
              FROM tracks t
              LEFT JOIN track_daily_stats s ON t.id = s.track_id\s
                    AND s.date_timestamp >= :startDate\s
                    AND s.date_timestamp <= :endDate
              WHERE t.artist_id = :artistId
                AND t.status != 'ARCHIVED'
              GROUP BY t.id, t.title, t.cover_minio_path
              ORDER BY plays DESC, unique_listeners DESC
              LIMIT :limit
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("artistId", artistId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate)
                .addValue("limit", limit);

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new TopTrackProjection(
                rs.getObject("track_id", UUID.class),
                rs.getString("title"),
                rs.getString("cover_minio_path"),
                rs.getLong("plays"),
                rs.getLong("skips"),
                rs.getLong("unique_listeners")
        ));
    }

    /**
     * Calculates metrics for a specific, single track.
     * IDOR Guard: The INNER JOIN ensures the track belongs to the requesting artist.
     */
    public AggregateMetricsProjection getTrackMetrics(UUID trackId, UUID artistId, LocalDate startDate, LocalDate endDate) {
                String sql = """
                        SELECT
                            COALESCE(SUM(s.plays), 0) AS total_plays,
                            COALESCE(SUM(s.skips), 0) AS total_skips,
                            COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners,
                            COALESCE(SUM(s.likes), 0) AS total_likes
                        FROM track_daily_stats s
                        INNER JOIN tracks t ON s.track_id = t.id
                        WHERE s.track_id = :trackIds
                          AND t.artist_id = :artistId
                          AND s.date_timestamp >= :startDates
                          AND s.date_timestamp <= :endDate
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("trackId", trackId)
                .addValue("artistId", artistId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new AggregateMetricsProjection(
                rs.getLong("total_plays"),
                rs.getLong("total_skips"),
                rs.getLong("unique_listeners"),
                rs.getLong("total_likes")
        ));
    }

    /**
     * Fetches daily discrete points for building line charts.
     */
    public List<TimeSeriesProjection> getTrackTimeSeries(UUID trackId, UUID artistId, LocalDate startDate, LocalDate endDate) {
        String sql = """

            SELECT
                s.date_timestamp,
                COALESCE(SUM(s.plays), 0) AS plays,
                COALESCE(SUM(s.skips), 0) AS skips,
                COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners,
                COALESCE(SUM(s.likes), 0) AS likes
            FROM track_daily_stats s
            INNER JOIN tracks t ON s.track_id = t.id
            WHERE s.track_id = :trackId
              AND t.artist_id = :artistId
              AND s.date_timestamp >= :startDate
              AND s.date_timestamp <= :endDate
            GROUP BY s.date_timestamp
            ORDER BY s.date_timestamp ASC
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("trackId", trackId)
                .addValue("artistId", artistId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new TimeSeriesProjection(
                rs.getDate("date_timestamp").toLocalDate(),
                rs.getLong("plays"),
                rs.getLong("skips"),
                rs.getLong("unique_listeners"),
                rs.getLong("likes")
        ));
    }

    /**
     * Attribution Funnel: Where are the plays coming from?
     * Queries the heavy partitioned raw logs.
     * PERFORMANCE GUARD: Strictly bounds created_at to trigger PostgreSQL Partition Pruning.
     */
    public List<AttributionProjection> getTrackAttribution(UUID trackId, UUID artistId, OffsetDateTime start, OffsetDateTime end) {
        String sql = """

            SELECT
                r.source_type,
                COUNT(r.event_id) AS count
            FROM raw_playback_logs r
            INNER JOIN tracks t ON r.track_id = t.id
            WHERE r.track_id = :trackId
              AND t.artist_id = :artistId
              AND r.created_at >= :start
              AND r.created_at <= :end
              AND r.playback_status IN ('FULL', 'PARTIAL')
              AND r.source_type != 'SYSTEM_INTERNAL'
            GROUP BY r.source_type
            ORDER BY count DESC
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("trackId", trackId)
                .addValue("artistId", artistId)
                .addValue("start", start)
                .addValue("end", end);

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new AttributionProjection(
                rs.getString("source_type"),
                rs.getLong("count")
        ));
    }
}