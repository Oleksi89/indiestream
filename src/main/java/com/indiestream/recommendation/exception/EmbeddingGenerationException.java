package com.indiestream.recommendation.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

import java.net.URI;

/**
 * Domain exception mapped to RFC 7807 Problem Detail.
 * Thrown when the LLM embedding generation completely fails after all retries.
 */
public class EmbeddingGenerationException extends RuntimeException {
    public EmbeddingGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}