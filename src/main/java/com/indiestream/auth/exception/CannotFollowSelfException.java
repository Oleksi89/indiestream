package com.indiestream.auth.exception;

public class CannotFollowSelfException extends RuntimeException {
    public CannotFollowSelfException(String message) {
        super(message);
    }
}