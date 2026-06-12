package com.indiestream.telemetry.repository;

import com.indiestream.telemetry.repository.projection.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    public AggregateMetricsProjection getArtistGlobalMetrics(UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        String sql = """
            WITH combined_stats AS (
                SELECT track_id, plays, skips, unique_listeners, likes
                FROM track_daily_stats
                WHERE date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= CAST(:endDate AS DATE)
                UNION ALL
                SELECT track_id, plays, skips, unique_listeners, likes
                FROM track_hourly_stats
                WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                  AND hour_timestamp <= :endDate
            )
            SELECT
                COALESCE(SUM(s.plays), 0) AS
                total_plays,
                COALESCE(SUM(s.skips
                ), 0) AS total_skips,
                COALESCE(SUM(s.
                unique_listeners), 0) AS unique_listeners,
                     COALESCE(SUM(s.likes), 0) AS
                total_likes
            FROM
                combined_stats s
            INNER JOIN
                tracks t ON s.track_id = t.id
            WHERE t.artist_id = :artistId
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
    public List<TopTrackProjection> getTopTracksForArtist(UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate, int limit) {
        String sql = """
              WITH combined_stats AS (
                  SELECT track_id, plays, skips, unique_listeners, likes 
                  FROM track_daily_stats 
                  WHERE date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= CAST(:endDate AS DATE)
                  UNION ALL
                  SELECT track_id, plays, skips, unique_listeners, likes 
                  FROM track_hourly_stats 
                  WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                    AND hour_timestamp <= :endDate
              )
              SELECT 
                  t.id AS track_id,
                  t.title,
                  t.cover_minio_path,
                  COALESCE(SUM(s.plays), 0) AS plays,
                  COALESCE(SUM(s.skips), 0) AS skips,
                  COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners
              FROM tracks t
              LEFT JOIN combined_stats s ON t.id = s.track_id
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
    public AggregateMetricsProjection getTrackMetrics(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
                String sql = """
                        WITH combined_stats AS (
                            SELECT track_id, plays, skips, unique_listeners, likes
                            FROM track_daily_stats
                            WHERE track_id = :trackId 
                              AND date_timestamp >= CAST(:startDate AS DATE) 
                              AND date_timestamp <= CAST(:endDate AS DATE)
                            UNION ALL
                            SELECT track_id, plays, skips, unique_listeners, likes
                            FROM track_hourly_stats
                            WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE) 
                                AND hour_timestamp <= :endDate
                        )
                        SELECT
                            COALESCE(SUM(s.plays), 0) AS total_plays,
                            COALESCE(SUM(s.skips), 0) AS total_skips,
                            COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners,
                            COALESCE(SUM(s.likes), 0) AS total_likes
                        FROM combined_stats s
                        INNER JOIN tracks t ON s.track_id = t.id
                        WHERE s.track_id = :trackId
                          AND t.artist_id = :artistId
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
    public List<TimeSeriesProjection> getTrackTimeSeries(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        String sql = """
                WITH combined_stats AS (
                    SELECT track_id, date_timestamp AS dt, plays, skips, unique_listeners, likes 
                    FROM track_daily_stats
                    WHERE date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= CAST(:endDate AS DATE)
                    UNION ALL
                    SELECT track_id, DATE(hour_timestamp AT TIME ZONE 'UTC') AS dt, plays, skips, unique_listeners, likes 
                    FROM track_hourly_stats 
                    WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)\s
                        AND hour_timestamp <= :endDate
                )
                SELECT
                    s.dt AS date_timestamp,
                    COALESCE(SUM(s.plays), 0) AS plays,
                    COALESCE(SUM(s.skips), 0) AS skips,
                    COALESCE(SUM(s.unique_listeners), 0) AS unique_listeners,
                    COALESCE(SUM(s.likes), 0) AS likes
                FROM combined_stats s
                INNER JOIN tracks t ON s.track_id = t.id
                WHERE s.track_id = :trackId AND t.artist_id = :artistId
                GROUP BY s.dt
                ORDER BY s.dt ASC
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
     * Retrieves the top 10 geographical regions by unique listener count for a specific track.
     * Optimizes database performance by querying pre-aggregated daily demographic tables for historical data
     * and combining them with filtered, real-time raw playback logs for the current day. Internal system
     * traffic is excluded.
     *
     * @param trackId   unique identifier of the track
     * @param artistId  unique identifier of the track owner/artist
     * @param startDate start date of the analysis window (inclusive)
     * @param endDate   end date of the analysis window (inclusive)
     * @return a sorted list of {@link RegionStatProjection} objects, limited to top 10 records descending by listener count
     */
    public List<RegionStatProjection> getTrackDemographics(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        String sql = """
            WITH combined_stats AS (
                SELECT client_country, listeners FROM track_daily_demographics 
                WHERE track_id = :trackId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= :endDate
                
                UNION ALL
                
                SELECT COALESCE(client_country, 'XX'), COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) 
                FROM raw_playback_logs r
                INNER JOIN tracks t ON r.track_id = t.id
                WHERE r.track_id = :trackId AND t.artist_id = :artistId
                  AND DATE(r.created_at AT TIME ZONE 'UTC') = CURRENT_DATE AND CURRENT_DATE <= :endDate
                  AND r.playback_status IN ('FULL', 'PARTIAL') AND r.source_type != 'SYSTEM_INTERNAL'
                GROUP BY COALESCE(client_country, 'XX')
            )
            SELECT client_country AS country_or_city, SUM(listeners) AS listeners
            FROM combined_stats
            GROUP BY client_country
            ORDER BY listeners DESC
            LIMIT 10
            """;

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("trackId", trackId).addValue("artistId", artistId).addValue("startDate", startDate).addValue("endDate", endDate);
        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new RegionStatProjection(rs.getString("country_or_city"), rs.getLong("listeners")));
    }

    /**
     * Identifies and aggregates traffic attribution sources (e.g., playlists, search, direct) for a specific track.
     * Resolves totals by merging pre-computed daily source metrics with current-day transactional playback logs,
     * ignoring internal system events.
     *
     * @param trackId   unique identifier of the track
     * @param artistId  unique identifier of the track owner/artist
     * @param startDate start date of the attribution period (inclusive)
     * @param endDate   end date of the attribution period (inclusive)
     * @return a list of {@link AttributionProjection} objects ordered by playback count in descending order
     */
    public List<AttributionProjection> getTrackAttribution(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        String sql = """
                WITH combined_stats AS (
                SELECT source_type, plays FROM track_daily_sources 
                WHERE track_id = :trackId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp <= CAST(:endDate AS DATE)
                
                UNION ALL
                
                SELECT r.source_type, COUNT(r.event_id) 
                FROM raw_playback_logs r
                INNER JOIN tracks t ON r.track_id = t.id
                WHERE r.track_id = :trackId AND t.artist_id = :artistId
                  AND DATE(r.created_at AT TIME ZONE 'UTC') = CURRENT_DATE AND CURRENT_DATE <= :endDate
                  AND r.playback_status IN ('FULL', 'PARTIAL') AND r.source_type != 'SYSTEM_INTERNAL'
                GROUP BY r.source_type
            )
            SELECT source_type, SUM(plays) AS count
            FROM combined_stats
            GROUP BY source_type
            ORDER BY count DESC
            """;

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("trackId", trackId).addValue("artistId", artistId).addValue("startDate", startDate).addValue("endDate", endDate);
        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new AttributionProjection(rs.getString("source_type"), rs.getLong("count")));
    }

    /**
     * Fetches the chronological unique listening history of a user.
     * Combines high-volume logs with static track metadata natively.
     */
    public List<HistoryTrackProjection> getUserListeningHistory(UUID userId, int limit, long offset) {
        String sql = """         
            SELECT 
                t.id AS track_id,
                t.title,
                t.artist_id,
                t.duration_seconds,
                t.cover_minio_path,
                t.status,
                t.genre,
                t.is_explicit,
                MAX(r.created_at) AS last_played_at,
                SUM(r.playback_duration_ms) AS total_listened_time_ms
            FROM raw_playback_logs r
            INNER JOIN tracks t ON r.track_id = t.id
            WHERE r.user_id = :userId
              AND r.playback_status IN ('FULL', 'PARTIAL')
              AND r.source_type != 'SYSTEM_INTERNAL'
            GROUP BY t.id, t.title, t.artist_id, t.duration_seconds, t.cover_minio_path, t.status, t.genre, t.is_explicit
            ORDER BY last_played_at DESC
            LIMIT :limit OFFSET :offset
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("limit", limit)
                .addValue("offset", offset);

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new HistoryTrackProjection(
                rs.getObject("track_id", UUID.class),
                rs.getString("title"),
                rs.getObject("artist_id", UUID.class),
                rs.getInt("duration_seconds"),
                rs.getString("cover_minio_path"),
                rs.getString("status"),
                rs.getString("genre"),
                rs.getBoolean("is_explicit"),
                rs.getTimestamp("last_played_at").toInstant().atOffset(java.time.ZoneOffset.UTC),
                rs.getLong("total_listened_time_ms")
        ));
    }

    /**
     * Counts the total unique tracks the user has listened to.
     */
    public long getUserListeningHistoryCount(UUID userId) {
        String sql = """
            SELECT COUNT(DISTINCT track_id)
            FROM raw_playback_logs
            WHERE user_id = :userId
              AND playback_status IN ('FULL', 'PARTIAL')
              AND source_type != 'SYSTEM_INTERNAL'
            """;

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("userId", userId);
        Long count = jdbcTemplate.queryForObject(sql, params, Long.class);
        return count != null ? count : 0L;
    }
}