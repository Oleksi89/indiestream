package com.indiestream.media.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable audit log for Track state transitions.
 * Tracks explicit actor actions and System/AI background jobs.
 */
@Entity
@Table(name = "track_audit_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "track_id", nullable = false)
    private UUID trackId;

    // Nullable. If null, the transition was triggered by a System Event (e.g., FFmpeg Webhook / AI Job)
    @Column(name = "actor_id")
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private TrackStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private TrackStatus newStatus;

    // Mandatory for transitions into REJECTED, BANNED, or NEEDS_REVISION
    @Column(columnDefinition = "TEXT")
    private String reason;

    // Stores the raw Gemini 1.5 Flash payload
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_payload")
    private Map<String, Object> aiPayload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}