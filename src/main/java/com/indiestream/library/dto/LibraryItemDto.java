package com.indiestream.library.dto;

import com.indiestream.library.domain.LibraryItemType;

import java.time.Instant;
import java.util.UUID;

/**
 * Polymorphic projection strictly designed for frontend sidebar rendering.
 * Stripped of all heavy collections and relational metadata.
 */
public record LibraryItemDto(
        UUID id,
        LibraryItemType type,
        String title,
        String imageUrl,
        String subtitle,
        Instant addedAt,
        String ownerId,
        boolean isCollaborative,
        boolean isCollaborator
) {
}