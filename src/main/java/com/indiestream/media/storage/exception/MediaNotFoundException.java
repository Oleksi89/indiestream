package com.indiestream.media.storage.exception;

public class MediaNotFoundException extends RuntimeException {
    public MediaNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public MediaNotFoundException(String message) {
        super(message);
    }
}