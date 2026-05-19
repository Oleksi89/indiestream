package com.indiestream.config;

import com.indiestream.auth.exception.EmailAlreadyInUseException;
import com.indiestream.auth.exception.UsernameAlreadyInUseException;
import com.indiestream.auth.exception.InvalidFileException;
import com.indiestream.auth.exception.FileTooLargeException;
import com.indiestream.playlist.exception.PlaylistNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

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

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setTitle("Bad Request");
        return problemDetail;
    }
}