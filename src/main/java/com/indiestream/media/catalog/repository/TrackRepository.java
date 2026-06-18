package com.indiestream.media.catalog.repository;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.moderation.dto.ModerationQueueProjection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Package-private encapsulation has been temporarily lifted for Modulith shared-kernel access.
 * Now implements JpaSpecificationExecutor for dynamic Criteria API queries.
 */
public interface TrackRepository extends JpaRepository<Track, UUID>, JpaSpecificationExecutor<Track> {

    /**
     * Highly optimized batch fetch enforcing strict FSM state visibility.
     * Prevents fetching BANNED or ARCHIVED tracks into JVM memory.
     */
    List<Track> findByIdInAndStatus(List<UUID> ids, TrackStatus status);

    /**
     * Retrieves a paginated list of tracks for a specific artist.
     * Ordered by creation date descending to show the newest uploads first.
     */
    Page<Track> findAllByArtistIdAndStatusOrderByCreatedAtDesc(UUID artistId, TrackStatus status, Pageable pageable);

    List<Track> findAllByArtistId(UUID artistId);

    /**
     * Retrieves a paginated list of all public tracks across the platform.
     * Ordered by creation date descending
     */
    Page<Track> findAllByStatusOrderByCreatedAtDesc(TrackStatus status, Pageable pageable);

    /**
     * Single, comprehensive search query handling text, genre, and GIN-indexed tags simultaneously.
     * STRICT GUARD: Only matches tracks where status equals :statusString (e.g., 'PUBLISHED').
     * Bypasses Hibernate 6 auto-translation bugs by explicitly binding limit and offset parameters.
     */
    @Query(value = """
            SELECT t.* FROM tracks t
            WHERE t.status = :statusString
            AND (:query IS NULL OR :query = '' OR LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')))
            AND (:genre IS NULL OR :genre = '' OR t.genre = :genre)
            AND (:tagsCsv IS NULL OR :tagsCsv = '' OR 
                jsonb_exists_any(t.tags->'custom', string_to_array(LOWER(:tagsCsv), ',')) OR
                jsonb_exists_any(t.tags->'moods', string_to_array(LOWER(:tagsCsv), ',')) OR
                jsonb_exists_any(t.tags->'aiGenerated', string_to_array(LOWER(:tagsCsv), ','))
            )
            ORDER BY t.popularity_score DESC, t.created_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Track> searchTracksUnifiedNative(
            @Param("query") String query,
            @Param("genre") String genre,
            @Param("tagsCsv") String tagsCsv,
            @Param("statusString") String statusString,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /**
     * Retrieves the moderation queue using a lightweight projection.
     * Orders by oldest first.
     */
    Page<ModerationQueueProjection> findAllByStatusOrderByCreatedAtAsc(TrackStatus status, Pageable pageable);

    @Query("SELECT t.id FROM Track t WHERE t.status IN :statuses")
    Slice<UUID> findAllIdsByStatusIn(@Param("statuses") Collection<TrackStatus> statuses, Pageable pageable);

    /**
     * Retrieves all tracks for the Artist Studio Dashboard.
     * STRICT GUARD: Excludes ARCHIVED tracks so they "disappear" from the artist's view (Soft Delete).
     */
    @Query("SELECT t FROM Track t WHERE t.artistId = :artistId AND t.status != 'ARCHIVED' ORDER BY t.createdAt DESC")
    Page<Track> findAllStudioTracksExcludingArchived(@Param("artistId") UUID artistId, Pageable pageable);

    /**
     * Executes an isolated high-performance atomic increment for track counters.
     */
    @Modifying
    @Query(value = "UPDATE tracks SET play_count = play_count + :plays, skip_count = skip_count + :skips, like_count = like_count + :likes WHERE id = :id", nativeQuery = true)
    void incrementTrackCounters(@Param("id") UUID id, @Param("plays") int plays, @Param("skips") int skips, @Param("likes") int likes);

    /**
     * Atomically updates the 768-dimensional AI vector space for a given track.
     * Uses JPQL because Hibernate 6 @JdbcTypeCode(SqlTypes.VECTOR) handles float[]-to-pgvector mapping safely.
     * Prevents overwriting other fields (like playCount) that might have changed concurrently.
     */
    @Modifying
    @Query("UPDATE Track t SET t.vector = :vector WHERE t.id = :id")
    void updateTrackVector(@Param("id") UUID id, @Param("vector") float[] vector);


    /**
     * ADMINISTRATIVE RECONCILIATION:
     * Overwrites the incremental counters (play_count, skip_count, like_count)
     * with the absolute totals derived from the historical telemetry warehouse.
     * Essential for synchronizing public data after E2E simulations or massive data purges.
     */
    @Modifying
    @Query(value = """
            UPDATE tracks t
            SET play_count = COALESCE((SELECT SUM(plays) FROM track_daily_stats WHERE track_id = t.id), 0),
                skip_count = COALESCE((SELECT SUM(skips) FROM track_daily_stats WHERE track_id = t.id), 0),
                like_count = COALESCE((SELECT SUM(likes) FROM track_daily_stats WHERE track_id = t.id), 0)
            """, nativeQuery = true)
    int syncAllTrackCountersFromTelemetry();
}