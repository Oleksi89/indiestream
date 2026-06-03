package com.indiestream.media.exception;

/**
 * Thrown when the AI moderation gateway fails to communicate with the LLM provider,
 * exhausts retry attempts, or receives an unparseable response.
 */
public class AiModerationException extends RuntimeException {

    public AiModerationException(String message) {
        super(message);
    }

    public AiModerationException(String message, Throwable cause) {
        super(message, cause);
    }
}