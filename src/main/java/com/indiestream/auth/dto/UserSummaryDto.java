package com.indiestream.auth.dto;

import java.util.UUID;

/**
 * Lightweight DTO designed for paginated lists to minimize payload size.
 */
public record UserSummaryDto(
        UUID id,
        String username,
        String alias,
        String avatarPath
) {
}