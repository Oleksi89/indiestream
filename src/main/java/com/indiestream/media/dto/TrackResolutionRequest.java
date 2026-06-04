package com.indiestream.media.dto;

import com.indiestream.media.domain.TrackTags;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TrackResolutionRequest(
        @NotNull(message = "Proposed tags cannot be null")
        @Valid
        TrackTags proposedTags,

        @NotBlank(message = "Justification must be provided when altering AI suggestions")
        @Size(min = 10, max = 500, message = "Justification must be between 10 and 500 characters")
        String justification
) {
}