package com.indiestream.media.domain;

import java.util.Set;

/**
 * Represents the lifecycle state of a Track within the IndieStream ingestion and moderation pipeline.
 * Encapsulates the Finite State Machine (FSM) transition matrix.
 */
public enum TrackStatus {
    DRAFT,
    PROCESSING,
    AI_ANALYSIS,
    NEEDS_REVISION,
    IN_REVIEW,
    APPROVED,
    READY,      // Legacy state / Fully processed and available for internal operations
    REJECTED,
    BANNED,
    PUBLISHED,
    FAILED;

    /**
     * Validates if a transition from the current state to the target state is allowed.
     * Enforces strict compliance with the platform's moderation and ingestion rules.
     *
     * @param nextState The proposed target state.
     * @return true if the transition is allowed, false otherwise.
     */
    public boolean isValidTransition(TrackStatus nextState) {
        if (this == nextState) return true; // Idempotent updates are permitted

        return switch (this) {
            case DRAFT -> Set.of(PROCESSING).contains(nextState);
            case PROCESSING ->
                    Set.of(AI_ANALYSIS, READY, FAILED, REJECTED).contains(nextState); // READY allowed for legacy pipeline bypass
            case AI_ANALYSIS -> Set.of(NEEDS_REVISION, IN_REVIEW, FAILED, DRAFT, APPROVED).contains(nextState);
            case NEEDS_REVISION -> Set.of(DRAFT, PROCESSING, APPROVED, IN_REVIEW).contains(nextState);
            case IN_REVIEW -> Set.of(APPROVED, REJECTED, BANNED).contains(nextState);
            case APPROVED -> Set.of(PUBLISHED, READY, DRAFT).contains(nextState);
            case READY -> Set.of(PUBLISHED, DRAFT, BANNED).contains(nextState);
            case PUBLISHED, REJECTED -> Set.of(DRAFT, BANNED, IN_REVIEW).contains(nextState);
            case FAILED -> Set.of(DRAFT, PROCESSING).contains(nextState); // Retry mechanisms
            case BANNED -> Set.of(IN_REVIEW).contains(nextState); // Allow Human-in-the-Loop appeals from BANNED
        };
    }
}