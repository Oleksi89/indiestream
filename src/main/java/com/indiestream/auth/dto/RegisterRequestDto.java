package com.indiestream.auth.dto;

public record RegisterRequestDto(
        String email,
        String password
) {}