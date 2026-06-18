package com.indiestream.telemetry.repository;

import com.indiestream.shared.event.PlaylistCountersAggregatedEvent;
import com.indiestream.shared.event.TrackCountersAggregatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Repository
@RequiredArgsConstructor
public class TelemetryRollupRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public int aggregateHourlyTrackPlaybacks(OffsetDateTime start, OffsetDateTime end) {
        String sql = """       
                INSERT INTO track_hourly_stats (track_id, hour_timestamp, plays, skips, unique_listeners, likes)
                SELECT
                    track_id,
                    date_trunc('hour', created_at) AS hour_timestamp,
                    COUNT(event_id) FILTER (WHERE playback_status IN ('FULL', 'PARTIAL')) AS plays_count,
                    COUNT(event_id) FILTER (WHERE playback_status = 'SKIP') AS skips_count,
                    COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS unique_listeners_count,
                    0 AS initial_likes
                FROM raw_playback_logs
                WHERE created_at >= :start AND created_at < :end
                  AND is_suspected_bot = false
                GROUP BY track_id, date_trunc('hour', created_at)
                ON CONFLICT (track_id, hour_timestamp)
                DO UPDATE SET
                    plays = EXCLUDED.plays,
                    skips = EXCLUDED.skips,
                    unique_listeners = EXCLUDED.unique_listeners
                """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", start).addValue("end", end));
    }

    public int aggregateHourlyTrackInteractions(OffsetDateTime start, OffsetDateTime end) {
        String sql = """
                INSERT INTO track_hourly_stats (track_id, hour_timestamp, plays, skips, unique_listeners, likes)
                SELECT
                    target_id,
                    date_trunc('hour', created_at) AS hour_timestamp,
                    0, 0, 0,
                    COUNT(event_id) AS likes_count
                FROM raw_interaction_logs
                WHERE created_at >= :start AND created_at < :end
                  AND interaction_type = 'LIKE'
                GROUP BY target_id, date_trunc('hour', created_at)
                ON CONFLICT (track_id, hour_timestamp)
                DO UPDATE SET
                    likes = EXCLUDED.likes
                """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", start).addValue("end", end));
    }

    /**
     * Aggregates daily statistics.
     * Applies CTE to accurately calculate distinct listeners directly from raw logs,
     * preventing the double-counting anomaly of summing hourly distincts.
     */
    public int aggregateDailyTrackStats(OffsetDateTime startOfDay, OffsetDateTime endOfDay) {
        String sql = """                
                WITH hourly_sums AS (
                    SELECT 
                        track_id,
                        DATE(hour_timestamp AT TIME ZONE 'UTC') AS date_timestamp,
                        SUM(plays) AS plays_sum,
                        SUM(skips) AS skips_sum,
                        SUM(likes) AS likes_sum
                    FROM track_hourly_stats
                    WHERE hour_timestamp >= :start AND hour_timestamp < :end
                    GROUP BY track_id, DATE(hour_timestamp AT TIME ZONE 'UTC')
                ),
                daily_uniques AS (
                    SELECT 
                        track_id,
                        DATE(created_at AT TIME ZONE 'UTC') AS date_timestamp,
                        COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS sessions_sum
                    FROM raw_playback_logs
                    WHERE created_at >= :start AND created_at < :end
                      AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
                    GROUP BY track_id, DATE(created_at AT TIME ZONE 'UTC')
                )
                INSERT INTO track_daily_stats (track_id, date_timestamp, plays, skips, unique_listeners, likes)
                SELECT 
                    h.track_id, h.date_timestamp, h.plays_sum, h.skips_sum, COALESCE(u.sessions_sum, 0), h.likes_sum
                FROM hourly_sums h
                LEFT JOIN daily_uniques u ON h.track_id = u.track_id AND h.date_timestamp = u.date_timestamp
                ON CONFLICT (track_id, date_timestamp) 
                DO UPDATE SET 
                    plays = EXCLUDED.plays,
                    skips = EXCLUDED.skips,
                    unique_listeners = EXCLUDED.unique_listeners,
                    likes = EXCLUDED.likes
                """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", startOfDay).addValue("end", endOfDay));
    }

    public int aggregateHourlyPlaylistInteractions(OffsetDateTime start, OffsetDateTime end) {
        String sql = """ 
            INSERT INTO playlist_hourly_stats (playlist_id, hour_timestamp, plays, skips, unique_listeners, likes)
            SELECT 
                target_id,
                date_trunc('hour', created_at) AS hour_timestamp,
                0, 0, 0,
                COUNT(event_id) AS likes_count
            FROM raw_interaction_logs
            WHERE created_at >= :start AND created_at < :end
              AND interaction_type = 'FOLLOW_PLAYLIST'
            GROUP BY target_id, date_trunc('hour', created_at)
            ON CONFLICT (playlist_id, hour_timestamp) 
            DO UPDATE SET likes = EXCLUDED.likes
            """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", start).addValue("end", end));
    }

    /**
     * Extracts exactly the aggregated data for a specific closed hour to broadcast deltas.
     */
    public List<TrackCountersAggregatedEvent> fetchTrackStatsForHour(OffsetDateTime hourTimestamp) {
        String sql = "SELECT track_id, plays, skips, likes FROM track_hourly_stats WHERE hour_timestamp = :hour";
        return jdbcTemplate.query(sql, new MapSqlParameterSource("hour", hourTimestamp), (rs, rowNum) ->
                new TrackCountersAggregatedEvent(
                        rs.getObject("track_id", java.util.UUID.class),
                        hourTimestamp,
                        rs.getInt("plays"),
                        rs.getInt("skips"),
                        rs.getInt("likes")
                )
        );
    }

    public List<PlaylistCountersAggregatedEvent> fetchPlaylistStatsForHour(OffsetDateTime hourTimestamp) {
        String sql = "SELECT playlist_id, likes FROM playlist_hourly_stats WHERE hour_timestamp = :hour";
        return jdbcTemplate.query(sql, new MapSqlParameterSource("hour", hourTimestamp), (rs, rowNum) ->
                new PlaylistCountersAggregatedEvent(
                        rs.getObject("playlist_id", java.util.UUID.class),
                        hourTimestamp,
                        rs.getInt("likes")
                )
        );
    }


    /**
     * Extracts playbacks specifically attributed to a Playlist context.
     */
    public int aggregateHourlyPlaylistPlaybacks(OffsetDateTime start, OffsetDateTime end) {
        String sql = """
            INSERT INTO playlist_hourly_stats (playlist_id, hour_timestamp, plays, skips, unique_listeners, likes)
            SELECT 
                source_id,
                date_trunc('hour', created_at) AS hour_timestamp,
                COUNT(event_id) FILTER (WHERE playback_status IN ('FULL', 'PARTIAL')) AS plays_count,
                COUNT(event_id) FILTER (WHERE playback_status = 'SKIP') AS skips_count,
                COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS unique_listeners_count,
                0 AS initial_likes
            FROM raw_playback_logs
            WHERE created_at >= :start AND created_at < :end
              AND source_type = 'PLAYLIST' AND source_id IS NOT NULL
              AND is_suspected_bot = false
            GROUP BY source_id, date_trunc('hour', created_at)
            ON CONFLICT (playlist_id, hour_timestamp) 
            DO UPDATE SET 
                plays = EXCLUDED.plays,
                skips = EXCLUDED.skips,
                unique_listeners = EXCLUDED.unique_listeners
            """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", start).addValue("end", end));
    }



    public int aggregateDailyPlaylistStats(OffsetDateTime startOfDay, OffsetDateTime endOfDay) {
        String sql = """
            WITH hourly_sums AS (
                SELECT playlist_id, DATE(hour_timestamp AT TIME ZONE 'UTC') AS date_timestamp,
                       SUM(plays) AS plays_sum, SUM(skips) AS skips_sum, SUM(likes) AS likes_sum
                FROM playlist_hourly_stats
                WHERE hour_timestamp >= :start AND hour_timestamp < :end
                GROUP BY playlist_id, DATE(hour_timestamp AT TIME ZONE 'UTC')
            ),
            daily_uniques AS (
                SELECT source_id AS playlist_id, DATE(created_at AT TIME ZONE 'UTC') AS date_timestamp,
                       COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) AS sessions_sum
                FROM raw_playback_logs
                WHERE created_at >= :start AND created_at < :end
                  AND source_type = 'PLAYLIST' AND source_id IS NOT NULL AND is_suspected_bot = false
                GROUP BY source_id, DATE(created_at AT TIME ZONE 'UTC')
            )
            INSERT INTO playlist_daily_stats (playlist_id, date_timestamp, plays, skips, unique_listeners, likes)
            SELECT h.playlist_id, h.date_timestamp, h.plays_sum, h.skips_sum, COALESCE(u.sessions_sum, 0), h.likes_sum
            FROM hourly_sums h
            LEFT JOIN daily_uniques u ON h.playlist_id = u.playlist_id AND h.date_timestamp = u.date_timestamp
            ON CONFLICT (playlist_id, date_timestamp) 
            DO UPDATE SET plays = EXCLUDED.plays, skips = EXCLUDED.skips, unique_listeners = EXCLUDED.unique_listeners, likes = EXCLUDED.likes
            """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", startOfDay).addValue("end", endOfDay));
    }

    public int aggregateDailyTrackDemographics(OffsetDateTime startOfDay, OffsetDateTime endOfDay) {
        String sql = """
            INSERT INTO track_daily_demographics (track_id, date_timestamp, client_country, listeners)
            SELECT 
                track_id, DATE(created_at AT TIME ZONE 'UTC') AS date_timestamp,
                COALESCE(client_country, 'XX'), COUNT(DISTINCT COALESCE(user_id::text, session_id::text))
            FROM raw_playback_logs
            WHERE created_at >= :start AND created_at < :end
              AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
            GROUP BY track_id, DATE(created_at AT TIME ZONE 'UTC'), COALESCE(client_country, 'XX')
            ON CONFLICT (track_id, date_timestamp, client_country) 
            DO UPDATE SET listeners = EXCLUDED.listeners
            """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", startOfDay).addValue("end", endOfDay));
    }

    public int aggregateDailyTrackSources(OffsetDateTime startOfDay, OffsetDateTime endOfDay) {
        String sql = """
            INSERT INTO track_daily_sources (track_id, date_timestamp, source_type, plays)
            SELECT 
                track_id, DATE(created_at AT TIME ZONE 'UTC') AS date_timestamp,
                source_type, COUNT(event_id)
            FROM raw_playback_logs
            WHERE created_at >= :start AND created_at < :end
              AND playback_status IN ('FULL', 'PARTIAL') AND source_type != 'SYSTEM_INTERNAL'
            GROUP BY track_id, DATE(created_at AT TIME ZONE 'UTC'), source_type
            ON CONFLICT (track_id, date_timestamp, source_type) 
            DO UPDATE SET plays = EXCLUDED.plays
            """;
        return jdbcTemplate.update(sql, new MapSqlParameterSource().addValue("start", startOfDay).addValue("end", endOfDay));
    }


    public int refreshTrackPopularityScores() {
        String sql = """
            WITH recent_stats AS (
                SELECT 
                    track_id, 
                    SUM(plays) * 1.0 + SUM(unique_listeners) * 2.0 + SUM(likes) * 5.0 AS calculated_score
                FROM track_daily_stats
                WHERE date_timestamp >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY track_id
            ),
            updated_active AS (
                UPDATE tracks t
                SET popularity_score = r.calculated_score
                FROM recent_stats r
                WHERE t.id = r.track_id
                RETURNING t.id
            )
            UPDATE tracks t
            SET popularity_score = popularity_score * 0.5
            WHERE id NOT IN (SELECT id FROM updated_active)
              AND popularity_score > 0.01;
            """;

        return jdbcTemplate.update(sql, new MapSqlParameterSource());
    }

    /**
     * Wipes aggregated hourly data for a specific window.
     * Required before a forced recalculation because UPSERTs cannot zero-out records
     * that have been completely deleted from the raw logs (GROUP BY returns 0 rows).
     */
    public void clearHourlyAggregations(OffsetDateTime start, OffsetDateTime end) {
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("start", start).addValue("end", end);
        jdbcTemplate.update("DELETE FROM track_hourly_stats WHERE hour_timestamp >= :start AND hour_timestamp < :end", params);
        jdbcTemplate.update("DELETE FROM playlist_hourly_stats WHERE hour_timestamp >= :start AND hour_timestamp < :end", params);
    }

    /**
     * Wipes aggregated daily data for a specific window.
     */
    public void clearDailyAggregations(OffsetDateTime start, OffsetDateTime end) {
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("start", start).addValue("end", end);
        jdbcTemplate.update("DELETE FROM track_daily_stats WHERE date_timestamp >= DATE(:start AT TIME ZONE 'UTC') AND date_timestamp < DATE(:end AT TIME ZONE 'UTC')", params);
        jdbcTemplate.update("DELETE FROM playlist_daily_stats WHERE date_timestamp >= DATE(:start AT TIME ZONE 'UTC') AND date_timestamp < DATE(:end AT TIME ZONE 'UTC')", params);
        jdbcTemplate.update("DELETE FROM track_daily_demographics WHERE date_timestamp >= DATE(:start AT TIME ZONE 'UTC') AND date_timestamp < DATE(:end AT TIME ZONE 'UTC')", params);
        jdbcTemplate.update("DELETE FROM track_daily_sources WHERE date_timestamp >= DATE(:start AT TIME ZONE 'UTC') AND date_timestamp < DATE(:end AT TIME ZONE 'UTC')", params);
    }


    /**
     * AI CORE: Fetches raw playback records for a specific time window.
     * STRICT FILTERING: Only returns records for authenticated users (user_id IS NOT NULL),
     * completely excluding anonymous sessions and suspected bots.
     * Used by the Taste Engine to apply asynchronous vector shifts (Plays/Skips).
     */
    public List<com.indiestream.telemetry.repository.RawPlaybackRecord> fetchAuthenticatedPlaybacksForWindow(
            OffsetDateTime start,
            OffsetDateTime end,
            List<String> ignoredUserAgents) {

        StringBuilder sql = new StringBuilder("""
                SELECT 
                    event_id, user_id, track_id, session_id, start_position_ms, 
                    end_position_ms, playback_duration_ms, client_ip, user_agent, 
                    is_suspected_bot, playback_status, source_type, source_id, 
                    client_country, created_at
                FROM raw_playback_logs
                WHERE created_at >= :start AND created_at < :end
                  AND user_id IS NOT NULL 
                  AND is_suspected_bot = false
                """);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("start", start)
                .addValue("end", end);

        if (ignoredUserAgents != null && !ignoredUserAgents.isEmpty()) {
            sql.append("  AND (user_agent IS NULL OR user_agent NOT IN (:ignoredUserAgents))\n");
            params.addValue("ignoredUserAgents", ignoredUserAgents);
        }

        return jdbcTemplate.query(sql.toString(), params, (rs, rowNum) ->
                new com.indiestream.telemetry.repository.RawPlaybackRecord(
                        rs.getObject("event_id", java.util.UUID.class),
                        rs.getObject("user_id", java.util.UUID.class),
                        rs.getObject("track_id", java.util.UUID.class),
                        rs.getObject("session_id", java.util.UUID.class),
                        rs.getInt("start_position_ms"),
                        rs.getInt("end_position_ms"),
                        rs.getInt("playback_duration_ms"),
                        rs.getString("client_ip"),
                        rs.getString("user_agent"),
                        rs.getBoolean("is_suspected_bot"),
                        rs.getString("playback_status"),
                        rs.getString("source_type"),
                        rs.getObject("source_id", java.util.UUID.class),
                        rs.getString("client_country"),
                        rs.getObject("created_at", OffsetDateTime.class)
                )
        );
    }
}