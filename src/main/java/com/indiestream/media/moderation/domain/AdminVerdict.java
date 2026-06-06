package com.indiestream.media.moderation.domain;

/**
 * Represents the deterministic actions available to human administrators
 * within the Global Moderation Workspace.
 */
public enum AdminVerdict {
    APPROVE,
    REJECT,
    BAN,
    RESTORE,        // Unbans or un-rejects a track (e.g., successful appeal)
    FORCE_ARCHIVE   // Legal or DMCA takedown (Soft delete without punitive BANNED status)
}