package com.indiestream.media.dto;

import com.indiestream.media.domain.AdminVerdict;
import com.indiestream.media.domain.TrackTags;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ModerationVerdictRequest(
        @NotNull(message = "Verdict is required")
        AdminVerdict verdict,

        // Required only if verdict is APPROVE, to finalize the metadata
        TrackTags finalTags,

        @NotBlank(message = "Admin reasoning must be provided for the audit log")
        String reason
) {
}