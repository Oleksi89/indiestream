package com.indiestream.auth.controller;

import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Handles public authentication and registration workflows
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /**
     * Creates a new user account. currently does not issue authentication tokens.
     * tokens will be generated in the future login flow implementation
     *
     * @param request Registration credentials.
     * @return Created UserDto without sensitive data.
     */
    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@RequestBody RegisterRequestDto request) {
        UserDto createdUser = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }
}