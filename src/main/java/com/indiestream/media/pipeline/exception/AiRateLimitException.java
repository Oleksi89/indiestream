package com.indiestream.media.pipeline.exception;

/**
 * Thrown strictly when the AI provider returns a 429 Too Many Requests
 * or explicitly indicates that RPM/RPD quotas have been exceeded.
 */
public class AiRateLimitException extends RuntimeException {

    public AiRateLimitException(String message) {
        super(message);
    }

    public AiRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}