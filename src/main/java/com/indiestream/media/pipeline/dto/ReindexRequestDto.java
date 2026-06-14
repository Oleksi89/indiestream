package com.indiestream.media.pipeline.dto;

import java.util.List;
import java.util.UUID;

/**
 * DTO for triggering manual AI vector recalculations.
 * Uses compact Java Records with built-in validation guard clauses.
 */
public record ReindexRequestDto(
        boolean all,
        List<UUID> trackIds
) {
    public ReindexRequestDto {
        if (!all && (trackIds == null || trackIds.isEmpty())) {
            throw new IllegalArgumentException("Must specify 'all=true' or provide a non-empty list of trackIds for re-indexing.");
        }
    }
}