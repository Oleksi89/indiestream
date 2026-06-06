package com.indiestream.config;

import com.indiestream.auth.exception.*;
import com.indiestream.media.moderation.exception.InvalidTrackStateException;
import com.indiestream.media.storage.exception.MediaNotFoundException;
import com.indiestream.media.storage.exception.MediaStreamException;
import com.indiestream.media.moderation.exception.AppealNotAllowedException;
import com.indiestream.playlist.exception.PlaylistNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailAlreadyInUseException.class)
    public ProblemDetail handleEmailAlreadyInUse(EmailAlreadyInUseException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Email Conflict");
        problemDetail.setType(URI.create("https://indiestream.com/errors/email-in-use"));
        return problemDetail;
    }

    @ExceptionHandler(UsernameAlreadyInUseException.class)
    public ProblemDetail handleUsernameAlreadyInUse(UsernameAlreadyInUseException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Username Conflict");
        problemDetail.setType(URI.create("https://indiestream.com/errors/username-in-use"));
        return problemDetail;
    }

    @ExceptionHandler(PlaylistNotFoundException.class)
    public ProblemDetail handlePlaylistNotFound(PlaylistNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setTitle("Playlist Not Found");
        return problemDetail;
    }

    @ExceptionHandler(InvalidFileException.class)
    public ProblemDetail handleInvalidFile(InvalidFileException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setTitle("Invalid File");
        problemDetail.setType(URI.create("https://indiestream.com/errors/invalid-file"));
        return problemDetail;
    }

    @ExceptionHandler(FileTooLargeException.class)
    public ProblemDetail handleFileTooLarge(FileTooLargeException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE, ex.getMessage());
        problemDetail.setTitle("Payload Too Large");
        problemDetail.setType(URI.create("https://indiestream.com/errors/file-too-large"));
        return problemDetail;
    }

    @ExceptionHandler(CannotFollowSelfException.class)
    public ProblemDetail handleCannotFollowSelf(CannotFollowSelfException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setTitle("Invalid Follow Operation");
        problemDetail.setType(URI.create("https://indiestream.com/errors/invalid-follow"));
        return problemDetail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setTitle("Bad Request");
        return problemDetail;
    }

    @ExceptionHandler(InvalidTrackStateException.class)
    public ProblemDetail handleInvalidTrackState(InvalidTrackStateException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problemDetail.setTitle("State Machine Transition Violation");
        problemDetail.setType(URI.create("https://indiestream.com/errors/invalid-track-state"));
        return problemDetail;
    }

    @ExceptionHandler(AppealNotAllowedException.class)
    public ProblemDetail handleAppealNotAllowed(AppealNotAllowedException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Appeal Not Allowed");
        problemDetail.setType(URI.create("https://indiestream.com/errors/appeal-denied"));
        return problemDetail;
    }

    /**
     * Handles validation errors for @RequestParam and @PathVariable (e.g., regex mismatches).
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
        String errorMessage = ex.getConstraintViolations().stream()
                .map(violation -> violation.getMessage())
                .collect(Collectors.joining(", "));

        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, errorMessage);
        problemDetail.setTitle("Invalid Request Parameters");
        problemDetail.setType(URI.create("https://indiestream.com/errors/validation-failure"));
        return problemDetail;
    }

    /**
     * Handles validation errors for @Valid @RequestBody DTOs.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));

        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, errorMessage);
        problemDetail.setTitle("Malformed Payload");
        problemDetail.setType(URI.create("https://indiestream.com/errors/payload-validation-failure"));
        return problemDetail;
    }


    @ExceptionHandler(MediaNotFoundException.class)
    public ProblemDetail handleMediaNotFound(MediaNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setTitle("Media Blob Not Found");
        problemDetail.setType(URI.create("https://indiestream.com/errors/media-not-found"));
        return problemDetail;
    }

    @ExceptionHandler(MediaStreamException.class)
    public ProblemDetail handleMediaStream(MediaStreamException ex) {
        // HTTP 503 for storage provider connection issues
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, "The storage provider is temporarily unavailable or returning errors.");
        problemDetail.setTitle("Storage Streaming Failure");
        problemDetail.setType(URI.create("https://indiestream.com/errors/storage-unavailable"));
        return problemDetail;
    }
}