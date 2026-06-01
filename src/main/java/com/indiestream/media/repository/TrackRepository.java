package com.indiestream.media.repository;

import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
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
     * Native PostgreSQL query exploiting the GIN index for O(1) performance.
     * Uses the ?| operator to find tracks where ANY of the provided search tags exist
     * in the custom, moods, OR aiGenerated JSONB arrays.
     */
    @Query(value = """
                SELECT * FROM tracks t
            WHERE t.status = :statusString
            AND (
                t.tags->'custom' ?| string_to_array(:tagsCsv, ',') OR
                t.tags->'moods' ?| string_to_array(:tagsCsv, ',') OR
                t.tags->'aiGenerated' ?| string_to_array(:tagsCsv, ',')
            )
            ORDER BY t.created_at DESC
            """, nativeQuery = true)
    List<Track> searchByTagsNative(@Param("tagsCsv") String tagsCsv, @Param("statusString") String statusString, Pageable pageable);
}