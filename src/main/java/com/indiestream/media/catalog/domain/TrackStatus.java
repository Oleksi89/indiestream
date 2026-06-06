package com.indiestream.media.catalog.domain;

import java.util.Set;

/**
 * Represents the lifecycle state of a Track within the IndieStream ingestion and moderation pipeline.
 * Encapsulates the Finite State Machine (FSM) transition matrix, including Global Admin overrides.
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
    FAILED,
    HIDDEN,     // Track is approved but manually hidden from public discovery by the artist
    ARCHIVED;   // Terminal soft-delete state for the artist (DMCA / Force Archive)

    /**
     * Validates if a transition from the current state to the target state is allowed.
     * Enforces strict compliance with the platform's moderation, ingestion, and admin policies.
     *
     * @param nextState The proposed target state.
     * @return true if the transition is allowed, false otherwise.
     */
    public boolean isValidTransition(TrackStatus nextState) {
        if (this == nextState) return true; // Idempotent updates are permitted

        return switch (this) {
            case DRAFT -> Set.of(PROCESSING, BANNED, ARCHIVED).contains(nextState);
            case PROCESSING ->
                    Set.of(AI_ANALYSIS, READY, FAILED, REJECTED, BANNED, ARCHIVED).contains(nextState); // READY allowed for legacy pipeline bypass
            case AI_ANALYSIS ->
                    Set.of(NEEDS_REVISION, IN_REVIEW, FAILED, DRAFT, APPROVED, BANNED, ARCHIVED).contains(nextState);
            case NEEDS_REVISION ->
                    Set.of(DRAFT, PROCESSING, APPROVED, IN_REVIEW, REJECTED, BANNED, ARCHIVED).contains(nextState);
            case IN_REVIEW -> Set.of(APPROVED, REJECTED, BANNED, ARCHIVED).contains(nextState);
            case APPROVED -> Set.of(PUBLISHED, READY, DRAFT, REJECTED, BANNED, ARCHIVED).contains(nextState);
            case READY -> Set.of(PUBLISHED, DRAFT, BANNED, HIDDEN, REJECTED, ARCHIVED).contains(nextState);
            case PUBLISHED -> Set.of(DRAFT, BANNED, IN_REVIEW, HIDDEN, REJECTED, ARCHIVED).contains(nextState);
            case REJECTED ->
                    Set.of(DRAFT, BANNED, IN_REVIEW, APPROVED, ARCHIVED).contains(nextState); // APPROVED for RESTORE
            case FAILED -> Set.of(DRAFT, PROCESSING, BANNED, ARCHIVED).contains(nextState);
            case BANNED -> Set.of(IN_REVIEW, APPROVED, ARCHIVED).contains(nextState); // APPROVED for RESTORE
            case HIDDEN -> Set.of(PUBLISHED, ARCHIVED, BANNED, REJECTED).contains(nextState);
            case ARCHIVED -> false; // Terminal state; no exit permitted under standard operations
        };
    }
}