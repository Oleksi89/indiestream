package com.indiestream.auth.dto;

public record LoginRequestDto(
        String email,
        String password
) {}