package com.indiestream.auth.dto;

public record UpdateUserProfileRequestDto(
        String alias,
        String bio,
        Boolean isPrivate,
        Boolean hideSubscriptions
) {
}