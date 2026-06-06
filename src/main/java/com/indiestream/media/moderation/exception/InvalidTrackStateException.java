package com.indiestream.media.moderation.exception;

/**
 * Thrown when an illegal state transition is attempted on a Track.
 */
public class InvalidTrackStateException extends RuntimeException {
    public InvalidTrackStateException(String message) {
        super(message);
    }
}