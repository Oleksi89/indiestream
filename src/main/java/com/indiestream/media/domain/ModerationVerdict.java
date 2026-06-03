package com.indiestream.media.domain;

/**
 * Represents the final decision made by the AI moderation engine.
 */
public enum ModerationVerdict {
    CLEAN,
    EXPLICIT_MINOR,
    REQUIRES_HUMAN,
    BANNED_CONTENT
}