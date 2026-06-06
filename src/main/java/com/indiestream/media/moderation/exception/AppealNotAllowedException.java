package com.indiestream.media.moderation.exception;

/**
 * Thrown when an artist violates moderation business rules,
 * such as attempting multiple appeals or appealing high-confidence bans.
 */
public class AppealNotAllowedException extends RuntimeException {
    public AppealNotAllowedException(String message) {
        super(message);
    }
}