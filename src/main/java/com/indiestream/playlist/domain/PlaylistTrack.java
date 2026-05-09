package com.indiestream.playlist.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "playlist_tracks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistTrack {

    @EmbeddedId
    private PlaylistTrackId id;

    @Column(name = "added_by_id", nullable = false, updatable = false)
    private UUID addedById;

    @Column(name = "added_at", updatable = false)
    @Builder.Default
    private Instant addedAt = Instant.now();

    @Column(name = "position_index", nullable = false)
    private Integer positionIndex;
}