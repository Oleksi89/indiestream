package com.indiestream.recommendation.service;

import com.indiestream.media.api.MediaVectorApi;
import com.indiestream.telemetry.api.event.PassiveTasteShiftsAggregatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Event listener for processing passive data (Plays, Skips) into vector math.
 * Decoupled from the Telemetry module's internal clock and HTTP thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PassiveTasteProcessor {

    private final VectorMathService vectorMathService;
    private final MediaVectorApi mediaVectorApi;

    /**
     * Processes a batch of raw telemetry logs, applying mathematical EMA shifts.
     * Groups by track first to avoid redundant DB queries for track vectors.
     */
    @Async
    @EventListener
    public void onPassiveTasteShiftsAggregated(PassiveTasteShiftsAggregatedEvent event) {
        if (event.shifts() == null || event.shifts().isEmpty()) return;

        // Note: isPrivateSession should be enforced at the API/Telemetry ingestion level.
        // We act on the assumption that records arriving here are legally permitted for AI use.

        // Group by track to optimize vector fetching
        Map<UUID, List<PassiveTasteShiftsAggregatedEvent.PassiveTasteShiftRecord>> shiftsByTrack = event.shifts().stream()
                .collect(Collectors.groupingBy(PassiveTasteShiftsAggregatedEvent.PassiveTasteShiftRecord::trackId));

        shiftsByTrack.forEach((trackId, trackShifts) -> {
            mediaVectorApi.getTrackVector(trackId).ifPresentOrElse(
                    vector -> processTrackGroup(vector, trackShifts),
                    () -> log.debug("Skipping vector shift for Track {}: Vector is null or track deleted.", trackId)
            );
        });
    }

    private void processTrackGroup(float[] trackVector, List<PassiveTasteShiftsAggregatedEvent.PassiveTasteShiftRecord> shifts) {
        for (PassiveTasteShiftsAggregatedEvent.PassiveTasteShiftRecord shift : shifts) {
            float alpha = determineAlpha(shift.actionType());
            if (alpha != 0f) {
                // Process sequentially per user. VectorMathService handles @Transactional isolation per shift.
                vectorMathService.shiftUserTasteVector(shift.userId(), trackVector, alpha);
            }
        }
    }

    /**
     * Maps the explicit PlaybackStatus Enum logic to mathematical Alpha weights.
     */
    private float determineAlpha(String actionType) {
        try {
            return switch (actionType) {
                case "FULL" -> VectorMathService.ALPHA_FULL_PLAY;
                case "SKIP" -> VectorMathService.ALPHA_SKIP;
                default -> 0f;
            };
        } catch (IllegalArgumentException e) {
            return 0f;
        }
    }
}