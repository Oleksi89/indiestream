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
@Table(name = "playlist_followers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistFollower {

    @EmbeddedId
    private PlaylistFollowerId id;

    @Column(name = "followed_at", updatable = false)
    @Builder.Default
    private Instant followedAt = Instant.now();
}