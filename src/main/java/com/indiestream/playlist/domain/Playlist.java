package com.indiestream.playlist.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "playlists")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Playlist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "cover_minio_path")
    private String coverMinioPath;

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = true;

    @Column(name = "is_system", nullable = false, updatable = false)
    @Builder.Default
    private Boolean isSystem = false;

    @Column(name = "is_collaborative", nullable = false)
    @Builder.Default
    private Boolean isCollaborative = false;

    // Cached aggregates to optimize read queries for the UI
    @Column(name = "track_count", nullable = false)
    @Builder.Default
    private Integer trackCount = 0;

    @Column(name = "total_duration_seconds", nullable = false)
    @Builder.Default
    private Integer totalDurationSeconds = 0;

    @Column(name = "followers_count", nullable = false)
    @Builder.Default
    private Integer followersCount = 0;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}