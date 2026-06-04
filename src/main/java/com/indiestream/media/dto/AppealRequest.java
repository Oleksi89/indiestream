package com.indiestream.media.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppealRequest(
        @NotBlank(message = "Appeal reason cannot be blank")
        @Size(min = 20, max = 1000, message = "Reason must be between 20 and 1000 characters")
        String reason
) {
}