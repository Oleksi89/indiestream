package com.indiestream.telemetry.api.event;

import java.util.List;
import java.util.UUID;

/**
 * Broadcasted when the TimeWindowRollupWorker extracts valid playback sessions.
 * Allows decoupled consumers (like the Recommendation Engine) to process vector shifts.
 */
public record PassiveTasteShiftsAggregatedEvent(
        List<PassiveTasteShiftRecord> shifts
) {
    public record PassiveTasteShiftRecord(
            UUID userId,
            UUID trackId,
            String actionType
    ) {
    }
}