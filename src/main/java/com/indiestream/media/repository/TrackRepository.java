package com.indiestream.media.repository;

import com.indiestream.media.domain.Track;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TrackRepository extends JpaRepository<Track, UUID> {

    List<Track> findAllByArtistIdOrderByCreatedAtDesc(UUID artistId);
}