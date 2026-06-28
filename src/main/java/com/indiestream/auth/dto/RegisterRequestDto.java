package com.indiestream.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Username is required")
        @Pattern(regexp = "^[a-zA-Z0-9_]{3,20}$", message = "Username must be 3-20 characters long and contain only letters, numbers, and underscores")
        String username,

        @NotBlank(message = "Alias is required")
        @Size(min = 1, max = 100, message = "Alias must be between 1 and 100 characters")
        String alias,

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters long")
        String password,

        @Pattern(regexp = "^(USER|ARTIST)$", message = "Role must be strictly USER or ARTIST")
        String role
) {
}