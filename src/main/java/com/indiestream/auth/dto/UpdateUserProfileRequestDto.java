package com.indiestream.auth.dto;

public record UpdateUserProfileRequestDto(
        String bio,
        Boolean isPrivate,
        Boolean hideSubscriptions
) {
}