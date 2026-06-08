package com.indiestream.telemetry.domain;

/**
 * Defines strictly allowed interaction events for telemetry ingestion.
 */
public enum InteractionType {
    LIKE,
    SHARE,
    ADD_TO_PLAYLIST,
    FOLLOW_USER,
    FOLLOW_PLAYLIST,
    TRACK_SKIP
}