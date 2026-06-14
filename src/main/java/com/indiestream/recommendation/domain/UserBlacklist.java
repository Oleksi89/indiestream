package com.indiestream.recommendation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Maps the user_blacklists table.
 * Adheres to Spring Modulith boundaries by storing isolated UUIDs for users and tracks
 * rather than hard @ManyToOne entity relationships, preventing cross-module leakage.
 */
@Entity
@Table(name = "user_blacklists")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBlacklist {

    @EmbeddedId
    private UserBlacklistId id;

    @Column(length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}