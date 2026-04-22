package com.indiestream.media.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tracks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Track {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Cross-module dependency avoided by storing UUID instead of User entity
    @Column(name = "artist_id", nullable = false)
    private UUID artistId;

    @Column(nullable = false)
    private String title;

    @Column(name = "minio_bucket_path", nullable = false)
    private String minioBucketPath;

    @Column(name = "cover_minio_path")
    private String coverMinioPath;

    // Native Hibernate 6 support for PostgreSQL JSONB
    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stems_metadata", nullable = false)
    private Map<String, String> stemsMetadata = new HashMap<>();

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

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