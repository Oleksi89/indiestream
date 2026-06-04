package com.indiestream.media.repository;

import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
import com.indiestream.media.dto.ModerationQueueProjection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

@Repository
public interface TrackRepository extends JpaRepository<Track, UUID> {

    /**
     * Retrieves a paginated list of tracks for a specific artist.
     * Ordered by creation date descending to show the newest uploads first.
     *
     * @param artistId the UUID of the artist
     * @param pageable pagination and sorting configuration
     * @return a page of tracks
     */
    Page<Track> findAllByArtistIdAndStatusOrderByCreatedAtDesc(UUID artistId, TrackStatus status, Pageable pageable);


    /**
     * Retrieves a paginated list of all public tracks across the platform.
     * Ordered by creation date descending
     *
     * @param pageable pagination and sorting configuration
     * @return a page of tracks
     */
    Page<Track> findAllByStatusOrderByCreatedAtDesc(TrackStatus status, Pageable pageable);

    /**
     * Executes an ILIKE search on the track title, strictly filtering by status.
     */
    @Query("SELECT t FROM Track t WHERE LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) AND t.status = :status ORDER BY t.createdAt DESC")
    List<Track> searchByTitleAndStatus(@Param("query") String query, @Param("status") TrackStatus status, Pageable pageable);

    /**
     * Executes an ILIKE search on the track title AND an exact match on genre.
     */
    @Query("SELECT t FROM Track t WHERE LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) AND t.genre = :genre AND t.status = :status ORDER BY t.createdAt DESC")
    List<Track> searchByTitleAndGenreAndStatus(@Param("query") String query, @Param("genre") String genre, @Param("status") TrackStatus status, Pageable pageable);

    /**
     * Single, comprehensive search query handling text, genre, and GIN-indexed tags simultaneously.
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
            ORDER BY t.created_at DESC
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
}