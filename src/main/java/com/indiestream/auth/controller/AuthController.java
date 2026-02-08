package com.indiestream.auth.controller;

import com.indiestream.auth.dto.AuthResponseDto;
import com.indiestream.auth.dto.LoginRequestDto;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.security.JwtService;
import com.indiestream.auth.service.TokenBlacklistService;
import com.indiestream.auth.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Handles public authentication and registration workflows
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;

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


    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@RequestBody LoginRequestDto request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        String jwtToken = jwtService.generateToken(request.email());
        return ResponseEntity.ok(new AuthResponseDto(jwtToken));
    }

    /**
     * Invalidates the current user session by blacklisting the active JWT.
     * Requires an authenticated context.
     * * @param request The HTTP request containing the Bearer token.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            long remainingTimeMillis = jwtService.getRemainingExpirationTime(jwt);

            if (remainingTimeMillis > 0) {
                tokenBlacklistService.blacklistToken(jwt, Duration.ofMillis(remainingTimeMillis));
            }
        }
        return ResponseEntity.noContent().build();
    }
}