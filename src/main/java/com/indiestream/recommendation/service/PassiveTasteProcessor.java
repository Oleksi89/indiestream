package com.indiestream.recommendation.service;

import com.indiestream.media.api.MediaVectorApi;
import com.indiestream.recommendation.api.dto.PassiveTasteShiftDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrator for processing passive telemetry data (Plays, Skips) into vector math.
 * Exists inside the recommendation domain but consumes telemetry structures.
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
    public void processBatch(List<PassiveTasteShiftDto> shifts) {
        if (shifts == null || shifts.isEmpty()) return;

        // Note: isPrivateSession should be enforced at the API/Telemetry ingestion level.
        // We act on the assumption that records arriving here are legally permitted for AI use.

        // Group by track to optimize vector fetching
        Map<UUID, List<PassiveTasteShiftDto>> shiftsByTrack = shifts.stream()
                .collect(Collectors.groupingBy(PassiveTasteShiftDto::trackId));

        shiftsByTrack.forEach((trackId, trackShifts) -> {
            mediaVectorApi.getTrackVector(trackId).ifPresentOrElse(
                    vector -> processTrackGroup(vector, trackShifts),
                    () -> log.debug("Skipping vector shift for Track {}: Vector is null or track deleted.", trackId)
            );
        });
    }

    private void processTrackGroup(float[] trackVector, List<PassiveTasteShiftDto> shifts) {
        for (PassiveTasteShiftDto shift : shifts) {
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