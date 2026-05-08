package com.indiestream.media.repository;

import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;

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
    Page<Track> findAllByStatusOrderByCreatedAtDesc(TrackStatus status,Pageable pageable);
}