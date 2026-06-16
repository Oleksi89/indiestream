package com.indiestream.auth.dto;

import java.time.Instant;

public record UserProfileDto(
        String bio,
        String avatarPath,
        String bannerPath,
        boolean isPrivate,
        boolean hideSubscriptions,
        boolean needsTasteCalibration,
        Instant updatedAt
) {
}