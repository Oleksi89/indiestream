package com.indiestream.media.domain;

/**
 * Categorizes the primary reason for a non-CLEAN moderation verdict.
 */
public enum ViolationCategory {
    NONE,
    PROFANITY,
    HATE_SPEECH,
    VIOLENCE,
    SEXUAL,
    COPYRIGHT_SUSPICION,
    OTHER
}