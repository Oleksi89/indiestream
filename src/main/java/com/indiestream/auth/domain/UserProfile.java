package com.indiestream.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
public class UserProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 500)
    private String bio;

    @Column(name = "avatar_path")
    private String avatarPath;

    @Column(name = "banner_path")
    private String bannerPath;

    @Column(name = "is_private", nullable = false)
    private boolean isPrivate = false;

    @Column(name = "hide_subscriptions", nullable = false)
    private boolean hideSubscriptions = false;

    // --- Recommendation Engine Vector Space ---

    /**
     * The 768-dimensional dynamic representation of the user's taste.
     * Updated via Exponential Moving Average (EMA).
     * Nullable: A NULL value indicates a "Cold Start" triggering the Onboarding flow.
     */
    @JdbcTypeCode(SqlTypes.VECTOR)
    @Column(name = "taste_vector", columnDefinition = "vector(768)")
    private float[] tasteVector;

    // Denormalized Social Graph Counters
    @Column(name = "followers_count", nullable = false)
    private Long followersCount = 0L;

    @Column(name = "following_count", nullable = false)
    private Long followingCount = 0L;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}