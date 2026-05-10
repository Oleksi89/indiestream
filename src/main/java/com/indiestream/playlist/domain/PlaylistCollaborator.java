package com.indiestream.playlist.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "playlist_collaborators")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistCollaborator {

    @EmbeddedId
    private PlaylistCollaboratorId id;

    @Column(name = "joined_at", updatable = false)
    @Builder.Default
    private Instant joinedAt = Instant.now();
}