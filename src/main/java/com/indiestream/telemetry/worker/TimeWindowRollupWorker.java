package com.indiestream.telemetry.worker;

import com.indiestream.shared.event.PlaylistCountersAggregatedEvent;
import com.indiestream.shared.event.TrackCountersAggregatedEvent;
import com.indiestream.telemetry.api.event.PassiveTasteShiftsAggregatedEvent;
import com.indiestream.telemetry.repository.RawPlaybackRecord;
import com.indiestream.telemetry.repository.TelemetryRollupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Distributed orchestrator for time-series aggregation.
 * Implements Near Real-Time (NRT) Micro-Batching for dashboards
 * and exact-once Modulith event broadcasting for closed windows.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimeWindowRollupWorker {

    private final TelemetryRollupRepository rollupRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${telemetry.ignored-user-agents:}")
    private List<String> ignoredUserAgents;

    /**
     * MICRO-BATCH: Executes every 5 minutes.
     * Continuously upserts the current active hour to provide Near Real-Time analytics to Artists.
     */
    @Scheduled(fixedRate = 300000)
    @SchedulerLock(name = "micro_batch_telemetry_rollup", lockAtLeastFor = "1m", lockAtMostFor = "4m")
    public void executeMicroBatchRollupCron() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        // Look back 2 hours to capture late-arriving events, spanning up to the current minute
        OffsetDateTime start = now.minusHours(2).truncatedTo(ChronoUnit.HOURS);
        OffsetDateTime end = now.plusHours(1).truncatedTo(ChronoUnit.HOURS);

        log.debug("[MICRO-BATCH] Aggregating telemetry from {} to {}", start, end);

        try {
            List<RawPlaybackRecord> rawRecords = rollupRepository.fetchAuthenticatedPlaybacksForWindow(start, end, ignoredUserAgents);

            // Map raw telemetry to cross-module DTOs to enforce strict Modulith boundaries
            List<PassiveTasteShiftsAggregatedEvent.PassiveTasteShiftRecord> shifts = rawRecords.stream()
                    .filter(r -> "FULL".equals(r.playbackStatus()) || "SKIP".equals(r.playbackStatus()))
                    .map(r -> new PassiveTasteShiftsAggregatedEvent.PassiveTasteShiftRecord(r.userId(), r.trackId(), r.playbackStatus()))
                    .toList();

            if (!shifts.isEmpty()) {
                log.debug("[AI CORE] Broadcasting {} passive taste shifts.", shifts.size());
                eventPublisher.publishEvent(new PassiveTasteShiftsAggregatedEvent(shifts));
            }
        } catch (Exception e) {
            // Catch to prevent analytical rollups from failing if the AI engine stalls
            log.error("[AI CORE] Failed to process passive taste shifts during micro-batch: {}", e.getMessage(), e);
        }

        executeHourlyRollup(start, end, false);
    }

    /**
     * CRON: Executes exactly once at minute 5 of every hour.
     * Broadcasts the finalized statistics of the previously closed hour.
     */
    @Scheduled(cron = "0 5 * * * *")
    @SchedulerLock(name = "hourly_event_broadcast", lockAtLeastFor = "2m", lockAtMostFor = "10m")
    public void executeHourlyEventBroadcastCron() {
        OffsetDateTime closedHour = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1).truncatedTo(ChronoUnit.HOURS);

        log.info("[CRON] Broadcasting aggregated events for closed hour: {}", closedHour);

        List<TrackCountersAggregatedEvent> trackEvents = rollupRepository.fetchTrackStatsForHour(closedHour);
        trackEvents.forEach(eventPublisher::publishEvent);

        List<PlaylistCountersAggregatedEvent> playlistEvents = rollupRepository.fetchPlaylistStatsForHour(closedHour);
        playlistEvents.forEach(eventPublisher::publishEvent);
    }

    /**
     * CRON: Executes every day at 02:00 AM UTC.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @SchedulerLock(name = "daily_telemetry_rollup", lockAtLeastFor = "5m", lockAtMostFor = "30m")
    public void executeDailyRollupCron() {
        OffsetDateTime targetDayEnd = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime targetDayStart = targetDayEnd.minusDays(3); // Auto-Heal Strategy

        log.info("[CRON] Starting Daily Telemetry Rollup for window: {} to {}", targetDayStart, targetDayEnd);
        int rows = executeDailyRollup(targetDayStart, targetDayEnd, false);
        log.info("[CRON] Daily aggregation complete. {} tracks preserved.", rows);
    }

    // --- PUBLIC METHODS FOR MANUAL TRIGGERING VIA ADMIN API ---

    /**
     * Executes the hourly database aggregation.
     *
     * @return A map containing operation statistics for the caller.
     */
    public Map<String, Integer> executeHourlyRollup(OffsetDateTime start, OffsetDateTime end, boolean isForceRecalculation) {
        log.info("Executing Hourly Rollup from {} to {}", start, end);

        if (isForceRecalculation) {
            rollupRepository.clearHourlyAggregations(start, end);
        }

        int trackPlayRows = rollupRepository.aggregateHourlyTrackPlaybacks(start, end);
        int trackInteractionRows = rollupRepository.aggregateHourlyTrackInteractions(start, end);
        int playlistPlayRows = rollupRepository.aggregateHourlyPlaylistPlaybacks(start, end);
        int playlistInteractionRows = rollupRepository.aggregateHourlyPlaylistInteractions(start, end);

        return Map.of(
                "trackPlaybacksAggregated", trackPlayRows,
                "trackInteractionsAggregated", trackInteractionRows,
                "playlistPlaybacksAggregated", playlistPlayRows,
                "playlistInteractionsAggregated", playlistInteractionRows
        );
    }

    /**
     * Executes the daily database compression logic.
     */
    public int executeDailyRollup(OffsetDateTime start, OffsetDateTime end, boolean isForceRecalculation) {
        log.info("Executing Daily Compression Rollup from {} to {} (Force: {})", start, end, isForceRecalculation);

        if (isForceRecalculation) {
            rollupRepository.clearDailyAggregations(start, end);
        }

        int compressedTracksCount = rollupRepository.aggregateDailyTrackStats(start, end);

        rollupRepository.aggregateDailyPlaylistStats(start, end);
        rollupRepository.aggregateDailyTrackDemographics(start, end);
        rollupRepository.aggregateDailyTrackSources(start, end);
        rollupRepository.refreshTrackPopularityScores();
        return compressedTracksCount;
    }
}