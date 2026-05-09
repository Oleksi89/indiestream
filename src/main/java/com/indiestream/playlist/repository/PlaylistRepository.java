package com.indiestream.playlist.repository;

import com.indiestream.playlist.domain.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {

    // Identifies the unique system playlist for a specific user
    Optional<Playlist> findByOwnerIdAndIsSystemTrue(UUID ownerId);
}