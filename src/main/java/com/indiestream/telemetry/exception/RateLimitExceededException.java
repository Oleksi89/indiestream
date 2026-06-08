package com.indiestream.telemetry.exception;

/**
 * Thrown when a client exceeds the allowed request threshold for telemetry ingestion.
 * Mapped to HTTP 429 Too Many Requests.
 */
public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}