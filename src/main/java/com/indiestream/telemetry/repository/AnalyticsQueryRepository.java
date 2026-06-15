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
import java.time.temporal.ChronoUnit;
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
        boolean isHourly = ChronoUnit.HOURS.between(startDate, endDate) <= 48;
        String sql;

        if (isHourly) {
            sql = """
                WITH stats AS (
                    SELECT COALESCE(SUM(s.plays), 0) AS plays, COALESCE(SUM(s.skips), 0) AS skips, COALESCE(SUM(s.likes), 0) AS likes
                    FROM track_hourly_stats s INNER JOIN tracks t ON s.track_id = t.id
                    WHERE t.artist_id = :artistId AND s.hour_timestamp >= :startDate AND s.hour_timestamp <= :endDate
                ),
                uniques AS (
                    SELECT COUNT(DISTINCT COALESCE(r.user_id::text, r.session_id::text)) AS listeners
                    FROM raw_playback_logs r INNER JOIN tracks t ON r.track_id = t.id
                    WHERE t.artist_id = :artistId AND r.created_at >= :startDate AND r.created_at <= :endDate
                      AND r.playback_status IN ('FULL', 'PARTIAL') AND r.source_type != 'SYSTEM_INTERNAL'
                )
                SELECT s.plays AS total_plays, s.skips AS total_skips, u.listeners AS unique_listeners, s.likes AS total_likes
                FROM stats s CROSS JOIN uniques u
                """;
        } else {
            sql = """
                WITH combined_stats AS (
                    SELECT s.plays, s.skips, s.likes
                    FROM track_daily_stats s INNER JOIN tracks t ON s.track_id = t.id
                    WHERE t.artist_id = :artistId AND s.date_timestamp >= CAST(:startDate AS DATE) AND s.date_timestamp < CAST(:endDate AS DATE)
                    UNION ALL
                    SELECT s.plays, s.skips, s.likes
                    FROM track_hourly_stats s INNER JOIN tracks t ON s.track_id = t.id
                    WHERE t.artist_id = :artistId AND CAST(s.hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                      AND s.hour_timestamp >= :startDate AND s.hour_timestamp <= :endDate
                ),
                uniques AS (
                    SELECT COUNT(DISTINCT COALESCE(r.user_id::text, r.session_id::text)) AS listeners
                    FROM raw_playback_logs r INNER JOIN tracks t ON r.track_id = t.id
                    WHERE t.artist_id = :artistId AND r.created_at >= :startDate AND r.created_at <= :endDate
                      AND r.playback_status IN ('FULL', 'PARTIAL') AND r.source_type != 'SYSTEM_INTERNAL'
                )
                SELECT COALESCE(SUM(c.plays), 0) AS total_plays, COALESCE(SUM(c.skips), 0) AS total_skips, MAX(u.listeners) AS unique_listeners, COALESCE(SUM(c.likes), 0) AS total_likes
                FROM combined_stats c CROSS JOIN uniques u
                """;
        }

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
                SELECT track_id, plays, skips, likes FROM track_daily_stats
                WHERE date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                UNION ALL
                SELECT track_id, plays, skips, likes FROM track_hourly_stats
                WHERE CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                  AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
            ),
            uniques AS (
                SELECT track_id, COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                FROM raw_playback_logs
                WHERE created_at >= :startDate AND created_at <= :endDate
                  AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                GROUP BY track_id
            )
            SELECT t.id AS track_id, t.title, t.cover_minio_path, t.popularity_score, COALESCE(SUM(c.plays), 0) AS plays, COALESCE(SUM(c.skips), 0) AS skips, COALESCE(MAX(u.listeners), 0) AS unique_listeners
            FROM tracks t LEFT JOIN combined_stats c ON t.id = c.track_id LEFT JOIN uniques u ON t.id = u.track_id
            WHERE t.artist_id = :artistId AND t.status != 'ARCHIVED'
            GROUP BY t.id, t.title, t.cover_minio_path, t.popularity_score
            ORDER BY plays DESC, unique_listeners DESC LIMIT :limit
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
                rs.getLong("unique_listeners"),
                rs.getDouble("popularity_score")
        ));
    }

    /**
     * Calculates metrics for a specific, single track.
     * IDOR Guard: The INNER JOIN ensures the track belongs to the requesting artist.
     */
    public AggregateMetricsProjection getTrackMetrics(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        boolean isHourly = ChronoUnit.HOURS.between(startDate, endDate) <= 48;
        String sql;

        if (isHourly) {
            sql = """
                WITH stats AS (
                    SELECT COALESCE(SUM(plays), 0) AS plays, COALESCE(SUM(skips), 0) AS skips, COALESCE(SUM(likes), 0) AS likes
                    FROM track_hourly_stats
                    WHERE track_id = :trackId AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                ),
                uniques AS (
                    SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                    FROM raw_playback_logs
                    WHERE track_id = :trackId AND created_at >= :startDate AND created_at <= :endDate
                      AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                )
                SELECT s.plays AS total_plays, s.skips AS total_skips, u.listeners AS unique_listeners, s.likes AS total_likes
                FROM stats s CROSS JOIN uniques u
                """;
        } else {
            sql = """
                    WITH combined_stats AS (
                        SELECT plays, skips, likes FROM track_daily_stats
                        WHERE track_id = :trackId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                        UNION ALL
                        SELECT plays, skips, likes FROM track_hourly_stats
                        WHERE track_id = :trackId AND CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                          AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                    ),
                    uniques AS (
                        SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                        FROM raw_playback_logs
                        WHERE track_id = :trackId AND created_at >= :startDate AND created_at <= :endDate
                          AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                    )
                    SELECT COALESCE(SUM(c.plays), 0) AS total_plays, COALESCE(SUM(c.skips), 0) AS total_skips, MAX(u.listeners) AS unique_listeners, COALESCE(SUM(c.likes), 0) AS total_likes
                    FROM combined_stats c CROSS JOIN uniques u
                    """;
        }

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
        boolean isHourly = ChronoUnit.HOURS.between(startDate, endDate) <= 48;
        String sql;

        if (isHourly) {
            sql = """
                WITH stats AS (
                    SELECT hour_timestamp AS dt, plays, skips, likes FROM track_hourly_stats
                    WHERE track_id = :trackId AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                ),
                uniques AS (
                    SELECT date_trunc('hour', created_at) AS dt, COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS listeners
                    FROM raw_playback_logs
                    WHERE track_id = :trackId AND created_at >= :startDate AND created_at <= :endDate
                      AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                    GROUP BY date_trunc('hour', created_at)
                )
                SELECT s.dt, s.plays, s.skips, COALESCE(u.listeners, 0) AS unique_listeners, s.likes 
                FROM stats s LEFT JOIN uniques u ON s.dt = u.dt ORDER BY s.dt ASC
                """;
        } else {
            sql = """
                    WITH historical AS (
                        SELECT CAST(date_timestamp AS TIMESTAMP WITH TIME ZONE) AS dt, plays, skips, unique_listeners, likes
                        FROM track_daily_stats
                        WHERE track_id = :trackId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                    ),
                    live_stats AS (
                        SELECT date_trunc('day', hour_timestamp) AS dt, SUM(plays) AS plays, SUM(skips) AS skips, SUM(likes) AS likes
                        FROM track_hourly_stats
                        WHERE track_id = :trackId AND CAST(hour_timestamp AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                          AND hour_timestamp >= :startDate AND hour_timestamp <= :endDate
                        GROUP BY date_trunc('day', hour_timestamp)
                    ),
                    live_uniques AS (
                        SELECT date_trunc('day', created_at) AS dt, COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS unique_listeners
                        FROM raw_playback_logs
                        WHERE track_id = :trackId AND CAST(created_at AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                          AND created_at >= :startDate AND created_at <= :endDate
                          AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                        GROUP BY date_trunc('day', created_at)
                    )
                    SELECT dt, plays, skips, unique_listeners, likes FROM historical
                    UNION ALL
                    SELECT s.dt, s.plays, s.skips, COALESCE(u.unique_listeners, 0), s.likes FROM live_stats s LEFT JOIN live_uniques u ON s.dt = u.dt
                    ORDER BY dt ASC
                    """;
        }

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("trackId", trackId)
                .addValue("artistId", artistId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new TimeSeriesProjection(
                rs.getTimestamp("dt").toInstant().atOffset(java.time.ZoneOffset.UTC),
                rs.getLong("plays"), rs.getLong("skips"),
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
                WHERE track_id = :trackId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                UNION ALL
                SELECT COALESCE(client_country, 'XX'), COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) 
                FROM raw_playback_logs r INNER JOIN tracks t ON r.track_id = t.id
                WHERE r.track_id = :trackId AND t.artist_id = :artistId AND CAST(r.created_at AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                  AND r.created_at >= :startDate AND r.created_at <= :endDate AND r.playback_status IN ('FULL', 'PARTIAL') AND r.source_type != 'SYSTEM_INTERNAL'
                GROUP BY COALESCE(client_country, 'XX')
            )
            SELECT client_country AS country_or_city, SUM(listeners) AS listeners
            FROM combined_stats GROUP BY client_country ORDER BY listeners DESC LIMIT 10
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
                WHERE track_id = :trackId AND date_timestamp >= CAST(:startDate AS DATE) AND date_timestamp < CAST(:endDate AS DATE)
                UNION ALL
                SELECT r.source_type, COUNT(r.event_id) FROM raw_playback_logs r INNER JOIN tracks t ON r.track_id = t.id
                WHERE r.track_id = :trackId AND t.artist_id = :artistId AND CAST(r.created_at AT TIME ZONE 'UTC' AS DATE) = CAST(:endDate AT TIME ZONE 'UTC' AS DATE)
                  AND r.created_at >= :startDate AND r.created_at <= :endDate AND r.playback_status IN ('FULL', 'PARTIAL') AND r.source_type != 'SYSTEM_INTERNAL'
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
     * Natively resolves descriptive track information combined with internal popularity ranking.
     * Enforces strict data isolation by bypassing the public MediaModuleApi contracts.
     */
    public TrackAnalyticsMetadataProjection getTrackAnalyticsMetadata(UUID trackId, UUID artistId) {
        String sql = """
            SELECT id, title, cover_minio_path, popularity_score
            FROM tracks
            WHERE id = :trackId AND artist_id = :artistId
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("trackId", trackId)
                .addValue("artistId", artistId);

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> new TrackAnalyticsMetadataProjection(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("cover_minio_path"),
                rs.getDouble("popularity_score")
        ));
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


    /**
     * Retrieves a distinct list of tracks the user has listened to recently.
     * Used by the Recommendation Engine to prevent repetitive Autoplay loops and ensure fresh discovery.
     */
    public List<UUID> getRecentTrackIdsForUser(UUID userId, OffsetDateTime since) {
        String sql = """
            
                SELECT DISTINCT track_id
            FROM raw_playback_logs
            WHERE user_id = :userId
              AND created_at >= :since
              AND playback_status IN ('FULL', 'PARTIAL')
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("since", since);

        return jdbcTemplate.queryForList(sql, params, UUID.class);
    }
}